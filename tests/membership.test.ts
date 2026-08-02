import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createMembershipWithCharge } from "../src/lib/membership";
import { calculateDiscountedFee } from "../src/lib/fees";
import { withAmpaScope } from "../src/lib/tenant";

// Fase 1: "cuotas por familia... con descuentos". Verifica contra Postgres real que
// createMembershipWithCharge calcula el importe reutilizando fees.ts (no duplica la
// lógica) y que Membership + Charge quedan correctamente scoped a la AMPA.

describe("createMembershipWithCharge (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let academicYearId: string;
  let feeSchemaId: string;
  let familyId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-MEMBERSHIP" },
      update: {},
      create: { name: "Test Center Membership", code: "TEST-CENTER-MEMBERSHIP" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-membership" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Membership", subdomain: "test-ampa-membership" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-membership-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Membership Other", subdomain: "test-ampa-membership-other" },
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

    const feeSchema = await prisma.feeSchema.create({
      data: {
        ampaId,
        academicYearId,
        name: "Cuota estándar",
        amount: 100,
        discountRules: { siblingDiscountPercent: 10, largeFamilyDiscountPercent: 15 },
      },
    });
    feeSchemaId = feeSchema.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "MEMBERSHIP-TEST-0001" } });
    familyId = family.id;
  });

  afterAll(async () => {
    await prisma.charge.deleteMany({ where: { ampaId } });
    await prisma.membership.deleteMany({ where: { ampaId } });
    await prisma.feeSchema.deleteMany({ where: { ampaId } });
    await prisma.family.deleteMany({ where: { ampaId } });
    await prisma.academicYear.deleteMany({ where: { ampaId } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-MEMBERSHIP" } });
    await prisma.$disconnect();
  });

  it("crea Membership + Charge con el importe calculado por fees.ts (alta el primer día de curso)", async () => {
    const result = await createMembershipWithCharge(ampaId, {
      familyId,
      feeSchemaId,
      enrollmentDate: new Date("2026-09-01"),
      familyDiscounts: { siblingCount: 2, isLargeFamily: false, scholarshipDiscountPercent: 0 },
    });

    // Alta el primer día de curso -> sin prorrateo (100% del importe base), con el
    // mismo cálculo de descuento que fees.test.ts ya verifica de forma aislada.
    const expectedAmount = calculateDiscountedFee(100, { siblingCount: 2, siblingDiscountPercent: 10 });
    expect(result.amount).toBe(expectedAmount);

    const membership = await prisma.membership.findUnique({ where: { id: result.membershipId } });
    expect(membership?.ampaId).toBe(ampaId);
    expect(membership?.status).toBe("ACTIVE");

    const charge = await prisma.charge.findUnique({ where: { id: result.chargeId } });
    expect(charge?.ampaId).toBe(ampaId);
    expect(charge?.status).toBe("PENDING");
    expect(Number(charge?.amount)).toBe(expectedAmount);
  });

  it("aplica el descuento de familia numerosa además del de hermanos", async () => {
    const result = await createMembershipWithCharge(ampaId, {
      familyId,
      feeSchemaId,
      enrollmentDate: new Date("2026-09-01"),
      familyDiscounts: { siblingCount: 1, isLargeFamily: true, scholarshipDiscountPercent: 0 },
    });

    const expectedAmount = calculateDiscountedFee(100, {
      siblingCount: 1,
      siblingDiscountPercent: 10,
      isLargeFamily: true,
      largeFamilyDiscountPercent: 15,
    });
    expect(result.amount).toBe(expectedAmount);
  });

  it("falla si el feeSchemaId no existe (o no es de esta AMPA)", async () => {
    await expect(
      createMembershipWithCharge(ampaId, {
        familyId,
        feeSchemaId: "non-existent-id",
        familyDiscounts: { siblingCount: 0, isLargeFamily: false, scholarshipDiscountPercent: 0 },
      }),
    ).rejects.toThrow();
  });

  it("no permite ver el Charge creado desde otra AMPA (aislamiento multi-tenant)", async () => {
    const result = await createMembershipWithCharge(ampaId, {
      familyId,
      feeSchemaId,
      enrollmentDate: new Date("2026-09-01"),
      familyDiscounts: { siblingCount: 0, isLargeFamily: false, scholarshipDiscountPercent: 0 },
    });

    const chargesFromOtherAmpa = await withAmpaScope(otherAmpaId, (db) =>
      db.charge.findMany({ where: { id: result.chargeId } }),
    );
    expect(chargesFromOtherAmpa).toHaveLength(0);
  });
});
