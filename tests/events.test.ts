import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { cancelEventRegistration, createEvent, registerFamilyForEvent } from "../src/lib/events";

describe("eventos: aforo, lista de espera y cobro (Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let familyAId: string;
  let familyBId: string;
  let familyCId: string;
  let otherAmpaFamilyId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-EVENTS" },
      update: {},
      create: { name: "Test Center Events", code: "TEST-CENTER-EVENTS" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-events" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Events", subdomain: "test-ampa-events" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-events-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Events Other", subdomain: "test-ampa-events-other" },
    });
    otherAmpaId = otherAmpa.id;

    const familyA = await prisma.family.create({ data: { ampaId, referenceCode: "EVT-A-0001" } });
    const familyB = await prisma.family.create({ data: { ampaId, referenceCode: "EVT-B-0001" } });
    const familyC = await prisma.family.create({ data: { ampaId, referenceCode: "EVT-C-0001" } });
    familyAId = familyA.id;
    familyBId = familyB.id;
    familyCId = familyC.id;

    const otherFamily = await prisma.family.create({ data: { ampaId: otherAmpaId, referenceCode: "EVT-OTHER-0001" } });
    otherAmpaFamilyId = otherFamily.id;
  });

  afterAll(async () => {
    await prisma.eventRegistration.deleteMany({ where: { event: { ampaId: { in: [ampaId, otherAmpaId] } } } });
    await prisma.charge.deleteMany({ where: { ampaId } });
    await prisma.event.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-EVENTS" } });
    await prisma.$disconnect();
  });

  it("inscribe con aforo libre y genera el cargo correspondiente (precio × asistentes)", async () => {
    const { id: eventId } = await createEvent(ampaId, {
      name: "Fiesta fin de curso",
      date: new Date("2027-06-20"),
      capacity: 10,
      price: 5,
    });

    const result = await registerFamilyForEvent(ampaId, { eventId, familyId: familyAId, attendeeCount: 3 });
    expect(result.status).toBe("REGISTERED");
    expect(result.chargeId).toBeTruthy();

    const charge = await prisma.charge.findUnique({ where: { id: result.chargeId } });
    expect(Number(charge?.amount)).toBe(15);
    expect(charge?.concept).toContain("Fiesta fin de curso");
  });

  it("pone en lista de espera si el nº de asistentes no cabe en el aforo restante", async () => {
    const { id: eventId } = await createEvent(ampaId, {
      name: "Excursión",
      date: new Date("2027-05-10"),
      capacity: 4,
    });

    const first = await registerFamilyForEvent(ampaId, { eventId, familyId: familyAId, attendeeCount: 3 });
    expect(first.status).toBe("REGISTERED");

    const second = await registerFamilyForEvent(ampaId, { eventId, familyId: familyBId, attendeeCount: 3 });
    expect(second.status).toBe("WAITLISTED");
  });

  it("no genera cargo si la inscripción queda en lista de espera", async () => {
    const { id: eventId } = await createEvent(ampaId, {
      name: "Concierto",
      date: new Date("2027-04-01"),
      capacity: 1,
      price: 10,
    });

    await registerFamilyForEvent(ampaId, { eventId, familyId: familyAId, attendeeCount: 1 });
    const second = await registerFamilyForEvent(ampaId, { eventId, familyId: familyBId, attendeeCount: 1 });

    expect(second.status).toBe("WAITLISTED");
    expect(second.chargeId).toBeUndefined();
  });

  it("promociona a la primera familia de la lista de espera que quepa en el aforo liberado", async () => {
    const { id: eventId } = await createEvent(ampaId, {
      name: "Chocolatada",
      date: new Date("2027-03-01"),
      capacity: 3,
    });

    const a = await registerFamilyForEvent(ampaId, { eventId, familyId: familyAId, attendeeCount: 3 });
    // familyB pide 3 (no cabe con 0 libres tras A), familyC pide 1 (tampoco cabe hasta que se libere sitio)
    const b = await registerFamilyForEvent(ampaId, { eventId, familyId: familyBId, attendeeCount: 3 });
    const c = await registerFamilyForEvent(ampaId, { eventId, familyId: familyCId, attendeeCount: 1 });

    expect(a.status).toBe("REGISTERED");
    expect(b.status).toBe("WAITLISTED");
    expect(c.status).toBe("WAITLISTED");

    // Se libera aforo para 3 personas -> familyB (3) debería colar antes que familyC (1) por ser FIFO y caber.
    await cancelEventRegistration(ampaId, { registrationId: a.registrationId });

    const bRegistration = await prisma.eventRegistration.findUnique({ where: { id: b.registrationId } });
    const cRegistration = await prisma.eventRegistration.findUnique({ where: { id: c.registrationId } });
    expect(bRegistration?.status).toBe("REGISTERED");
    expect(cRegistration?.status).toBe("WAITLISTED");
  });

  it("no permite inscribir a una familia de otra AMPA (aislamiento multi-tenant)", async () => {
    const { id: eventId } = await createEvent(ampaId, { name: "Feria del libro", date: new Date("2027-02-01") });

    await expect(
      registerFamilyForEvent(ampaId, { eventId, familyId: otherAmpaFamilyId, attendeeCount: 1 }),
    ).rejects.toThrow();
  });

  it("no permite inscribir dos veces a la misma familia en el mismo evento", async () => {
    const { id: eventId } = await createEvent(ampaId, { name: "Torneo deportivo", date: new Date("2027-01-15") });

    await registerFamilyForEvent(ampaId, { eventId, familyId: familyAId, attendeeCount: 2 });
    await expect(
      registerFamilyForEvent(ampaId, { eventId, familyId: familyAId, attendeeCount: 1 }),
    ).rejects.toThrow();
  });
});
