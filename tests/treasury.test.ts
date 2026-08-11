import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  listOverdueCharges,
  createExpenseForecast,
  listExpenseForecasts,
  markExpenseForecastPaid,
  getCashFlowForecast,
} from "../src/lib/treasury";

// Fase 2: impagos y previsión de tesorería. `Charge.status` nunca pasa a
// OVERDUE en la base de datos (hallazgo documentado en treasury.ts) — se
// verifica aquí que "atrasado" se calcula bien de forma derivada.

describe("treasury (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let familyId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-TREASURY" },
      update: {},
      create: { name: "Test Center Treasury", code: "TEST-CENTER-TREASURY" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-treasury" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Treasury", subdomain: "test-ampa-treasury" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-treasury-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Treasury Other", subdomain: "test-ampa-treasury-other" },
    });
    otherAmpaId = otherAmpa.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "TREASURY-0001" } });
    familyId = family.id;
    await prisma.guardian.create({
      data: { familyId, name: "Tutor Treasury", email: "tutor.treasury@example.com" },
    });
  });

  afterAll(async () => {
    await prisma.expenseForecast.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.charge.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-TREASURY" } });
    await prisma.$disconnect();
  });

  it("listOverdueCharges devuelve solo los cargos PENDING con vencimiento pasado", async () => {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 10);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    await prisma.charge.create({
      data: { ampaId, familyId, concept: "Atrasado", amount: 50, dueDate: overdueDate, status: "PENDING" },
    });
    await prisma.charge.create({
      data: { ampaId, familyId, concept: "Aún no vence", amount: 60, dueDate: futureDate, status: "PENDING" },
    });
    await prisma.charge.create({
      data: { ampaId, familyId, concept: "Ya pagado", amount: 70, dueDate: overdueDate, status: "PAID" },
    });

    const overdue = await listOverdueCharges(ampaId);

    expect(overdue).toHaveLength(1);
    expect(overdue[0]?.concept).toBe("Atrasado");
    expect(overdue[0]?.daysOverdue).toBeGreaterThanOrEqual(9);
    expect(overdue[0]?.familyGuardianNames).toEqual(["Tutor Treasury"]);
  });

  it("no filtra impagos de otra AMPA (aislamiento multi-tenant)", async () => {
    const overdue = await listOverdueCharges(otherAmpaId);
    expect(overdue).toHaveLength(0);
  });

  it("createExpenseForecast + listExpenseForecasts + markExpenseForecastPaid", async () => {
    const created = await createExpenseForecast(ampaId, {
      description: "Alquiler autobús",
      amount: 200,
      expectedDate: new Date(),
    });

    let expenses = await listExpenseForecasts(ampaId);
    expect(expenses.some((e) => e.id === created.id && e.status === "PLANNED")).toBe(true);

    await markExpenseForecastPaid(ampaId, { expenseForecastId: created.id });

    expenses = await listExpenseForecasts(ampaId);
    expect(expenses.find((e) => e.id === created.id)?.status).toBe("PAID");
  });

  it("markExpenseForecastPaid falla si ya está pagado", async () => {
    const created = await createExpenseForecast(ampaId, {
      description: "Material",
      amount: 30,
      expectedDate: new Date(),
    });
    await markExpenseForecastPaid(ampaId, { expenseForecastId: created.id });

    await expect(markExpenseForecastPaid(ampaId, { expenseForecastId: created.id })).rejects.toThrow(
      "ya está marcado como pagado",
    );
  });

  it("getCashFlowForecast combina ingresos (Charge PENDING) y gastos (ExpenseForecast PLANNED) por mes, con el neto", async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);

    await prisma.charge.create({
      data: { ampaId, familyId, concept: "Cuota mes actual", amount: 100, dueDate: thisMonth, status: "PENDING" },
    });
    await createExpenseForecast(ampaId, { description: "Gasto mes actual", amount: 40, expectedDate: thisMonth });

    const forecast = await getCashFlowForecast(ampaId);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentMonthRow = forecast.find((row) => row.month === monthKey);

    expect(currentMonthRow).toBeDefined();
    expect(currentMonthRow!.income).toBeGreaterThanOrEqual(100);
    expect(currentMonthRow!.expenses).toBeGreaterThanOrEqual(40);
    expect(currentMonthRow!.net).toBe(currentMonthRow!.income - currentMonthRow!.expenses);
    expect(forecast).toHaveLength(6);
  });
});
