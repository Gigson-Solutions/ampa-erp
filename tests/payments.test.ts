import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { recordManualPayment } from "../src/lib/payments";
import { withAmpaScope } from "../src/lib/tenant";

describe("recordManualPayment (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let familyId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-PAYMENTS" },
      update: {},
      create: { name: "Test Center Payments", code: "TEST-CENTER-PAYMENTS" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-payments" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Payments", subdomain: "test-ampa-payments" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-payments-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Payments Other", subdomain: "test-ampa-payments-other" },
    });
    otherAmpaId = otherAmpa.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "PAY-TEST-0001" } });
    familyId = family.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.charge.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-PAYMENTS" } });
    await prisma.$disconnect();
  });

  it("registra el pago y marca el cargo como PAID", async () => {
    const charge = await prisma.charge.create({
      data: { ampaId, familyId, concept: "Cuota de prueba", amount: 75, dueDate: new Date(), status: "PENDING" },
    });

    const result = await recordManualPayment(ampaId, { chargeId: charge.id, method: "TRANSFER" });

    expect(result.amount).toBe(75);

    const updatedCharge = await prisma.charge.findUnique({ where: { id: charge.id } });
    expect(updatedCharge?.status).toBe("PAID");

    const payment = await prisma.payment.findUnique({ where: { id: result.paymentId } });
    expect(payment?.ampaId).toBe(ampaId);
    expect(payment?.method).toBe("TRANSFER");
    expect(payment?.status).toBe("SETTLED");
    expect(Number(payment?.amount)).toBe(75);
  });

  it("no permite pagar dos veces el mismo cargo", async () => {
    const charge = await prisma.charge.create({
      data: { ampaId, familyId, concept: "Cuota ya pagada", amount: 50, dueDate: new Date(), status: "PENDING" },
    });

    await recordManualPayment(ampaId, { chargeId: charge.id, method: "CASH" });

    await expect(recordManualPayment(ampaId, { chargeId: charge.id, method: "CASH" })).rejects.toThrow();
  });

  it("falla si el cargo no existe (o no es de esta AMPA)", async () => {
    await expect(
      recordManualPayment(ampaId, { chargeId: "non-existent-id", method: "TRANSFER" }),
    ).rejects.toThrow();
  });

  it("no permite ver el Payment creado desde otra AMPA (aislamiento multi-tenant)", async () => {
    const charge = await prisma.charge.create({
      data: { ampaId, familyId, concept: "Cuota aislamiento", amount: 60, dueDate: new Date(), status: "PENDING" },
    });

    const result = await recordManualPayment(ampaId, { chargeId: charge.id, method: "CASH" });

    const paymentsFromOtherAmpa = await withAmpaScope(otherAmpaId, (db) =>
      db.payment.findMany({ where: { id: result.paymentId } }),
    );
    expect(paymentsFromOtherAmpa).toHaveLength(0);
  });
});
