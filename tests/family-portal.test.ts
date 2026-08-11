import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { getMyFamilyOverview, inviteGuardianToPortal } from "../src/lib/family-portal";

// Portal de familias (Feedback #5, 2026-08-11) — cada tutor/a ve SOLO su
// propia familia. Acceso por invitación: `inviteGuardianToPortal` crea el
// `User` + rol `FAMILIA` + enlaza `Guardian.userId`; `getMyFamilyOverview`
// resuelve la familia de ESE usuario dentro de la AMPA activa.

describe("family-portal (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let familyId: string;
  let guardianId: string;
  let academicYearId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-PORTAL" },
      update: {},
      create: { name: "Test Center Portal", code: "TEST-CENTER-PORTAL" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-portal" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Portal", subdomain: "test-ampa-portal" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-portal-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Portal Other", subdomain: "test-ampa-portal-other" },
    });
    otherAmpaId = otherAmpa.id;

    const academicYear = await prisma.academicYear.create({
      data: {
        ampaId,
        label: "2026-2027",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-06-30"),
        isActive: true,
      },
    });
    academicYearId = academicYear.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "PORTAL-0001" } });
    familyId = family.id;

    const guardian = await prisma.guardian.create({
      data: { familyId, name: "Tutor Portal", email: "tutor.portal@example.com" },
    });
    guardianId = guardian.id;

    const student = await prisma.student.create({ data: { familyId, name: "Alumno Portal" } });

    await prisma.charge.create({
      data: { ampaId, familyId, concept: "Cuota", amount: 100, dueDate: new Date(), status: "PENDING" },
    });

    const activity = await prisma.activity.create({
      data: { ampaId, academicYearId, name: "Actividad Portal", price: 0 },
    });
    await prisma.activityEnrollment.create({
      data: { activityId: activity.id, studentId: student.id, status: "ENROLLED" },
    });

    const event = await prisma.event.create({
      data: { ampaId, name: "Evento Portal", date: new Date("2027-05-01") },
    });
    await prisma.eventRegistration.create({
      data: { eventId: event.id, familyId, attendeeCount: 2, status: "REGISTERED" },
    });
  });

  afterAll(async () => {
    await prisma.userAmpaRole.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.activity.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.event.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.academicYear.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-PORTAL" } });
    const user = await prisma.user.findUnique({ where: { email: "tutor.portal@example.com" } });
    if (user) await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it("getMyFamilyOverview devuelve null si el usuario no está enlazado a ninguna familia", async () => {
    const result = await getMyFamilyOverview(ampaId, "non-existent-user-id");
    expect(result).toBeNull();
  });

  it("inviteGuardianToPortal crea el User, enlaza el Guardian y da el rol FAMILIA", async () => {
    const result = await inviteGuardianToPortal(ampaId, guardianId);
    expect(result.email).toBe("tutor.portal@example.com");

    const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });
    expect(guardian?.userId).not.toBeNull();

    const user = await prisma.user.findUnique({ where: { email: "tutor.portal@example.com" } });
    expect(user).not.toBeNull();

    const role = await prisma.userAmpaRole.findFirst({ where: { userId: user!.id, ampaId, role: "FAMILIA" } });
    expect(role).not.toBeNull();
  });

  it("inviteGuardianToPortal falla para un guardian de otra AMPA", async () => {
    await expect(inviteGuardianToPortal(otherAmpaId, guardianId)).rejects.toThrow(
      "Tutor/a no encontrado/a para esta AMPA",
    );
  });

  it("getMyFamilyOverview devuelve hijos/as, cuotas, actividades y eventos de la familia", async () => {
    const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });

    const overview = await getMyFamilyOverview(ampaId, guardian!.userId!);

    expect(overview).not.toBeNull();
    expect(overview?.referenceCode).toBe("PORTAL-0001");
    expect(overview?.children).toHaveLength(1);
    expect(overview?.children[0]?.name).toBe("Alumno Portal");
    expect(overview?.charges).toHaveLength(1);
    expect(overview?.charges[0]?.amount).toBe(100);
    expect(overview?.activities).toHaveLength(1);
    expect(overview?.activities[0]?.activityName).toBe("Actividad Portal");
    expect(overview?.events).toHaveLength(1);
    expect(overview?.events[0]?.eventName).toBe("Evento Portal");
  });

  it("no filtra la familia si se consulta desde otra AMPA (aislamiento multi-tenant)", async () => {
    const guardian = await prisma.guardian.findUnique({ where: { id: guardianId } });
    const overview = await getMyFamilyOverview(otherAmpaId, guardian!.userId!);
    expect(overview).toBeNull();
  });
});
