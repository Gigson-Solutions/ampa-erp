import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { getFamilyCardByToken, getOrCreateFamilyCardToken } from "../src/lib/card";

describe("carnet digital (Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let familyId: string;
  let academicYearId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-CARD" },
      update: {},
      create: { name: "Test Center Card", code: "TEST-CENTER-CARD" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-card" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Card", subdomain: "test-ampa-card" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-card-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Card Other", subdomain: "test-ampa-card-other" },
    });
    otherAmpaId = otherAmpa.id;

    const academicYear = await prisma.academicYear.upsert({
      where: { ampaId_label: { ampaId, label: "2026-2027" } },
      update: {},
      create: {
        ampaId,
        label: "2026-2027",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-06-30"),
        isActive: true,
      },
    });
    academicYearId = academicYear.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "CARD-TEST-0001" } });
    familyId = family.id;
  });

  afterAll(async () => {
    await prisma.membership.deleteMany({ where: { ampaId } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.academicYear.deleteMany({ where: { ampaId } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-CARD" } });
    await prisma.$disconnect();
  });

  it("genera un token la primera vez y lo reutiliza después (idempotente)", async () => {
    const first = await getOrCreateFamilyCardToken(ampaId, familyId);
    const second = await getOrCreateFamilyCardToken(ampaId, familyId);
    expect(first).toBe(second);
    expect(first).toHaveLength(36); // UUID
  });

  it("resuelve el carnet por token con estado NONE si no hay membresía", async () => {
    const token = await getOrCreateFamilyCardToken(ampaId, familyId);
    const card = await getFamilyCardByToken(ampaId, token);

    expect(card?.referenceCode).toBe("CARD-TEST-0001");
    expect(card?.membershipStatus).toBe("NONE");
    expect(card?.academicYearLabel).toBeNull();
  });

  it("refleja el estado de la membresía más reciente", async () => {
    await prisma.membership.create({
      data: { ampaId, familyId, academicYearId, status: "ACTIVE" },
    });

    const token = await getOrCreateFamilyCardToken(ampaId, familyId);
    const card = await getFamilyCardByToken(ampaId, token);

    expect(card?.membershipStatus).toBe("ACTIVE");
    expect(card?.academicYearLabel).toBe("2026-2027");
  });

  it("devuelve null si el token no existe", async () => {
    const card = await getFamilyCardByToken(ampaId, "token-que-no-existe");
    expect(card).toBeNull();
  });

  it("devuelve null si el token es de otra AMPA (aislamiento multi-tenant)", async () => {
    const token = await getOrCreateFamilyCardToken(ampaId, familyId);
    const cardFromOtherAmpa = await getFamilyCardByToken(otherAmpaId, token);
    expect(cardFromOtherAmpa).toBeNull();
  });
});
