import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 2 (ver roadmap): "impagos y previsión de tesorería". Hallazgo real al
// revisar el código (ver Charge en schema.prisma): `Charge.status` nunca pasa
// a `OVERDUE` en ningún sitio — solo es un valor de enum documentado en el
// comentario del schema, board-directory.ts/platform-admin.ts ya filtran por
// `["PENDING", "OVERDUE"]` pero esa segunda condición nunca se cumple. Aquí se
// calcula "atrasado" de forma derivada (`status === "PENDING" && dueDate <
// ahora`) en tiempo de lectura, sin mutar la fila ni depender de un cron
// (coherente con el objetivo de coste marginal ~0 del proyecto).
//
// La previsión de GASTOS usa `ExpenseForecast` — deliberadamente separado de
// `LedgerEntry` (contabilidad PGC ESFL formal, todavía sin construir): esto es
// una previsión de caja rápida para la junta, no la contabilidad legal.

export interface OverdueChargeSummary {
  id: string;
  familyReferenceCode: string;
  familyGuardianNames: string[];
  concept: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
}

/**
 * Cargos `PENDING` con la fecha de vencimiento ya pasada, ordenados por días
 * de atraso (los más atrasados primero) — la vista de "impagos" propiamente.
 */
export async function listOverdueCharges(ampaId: string): Promise<OverdueChargeSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const now = new Date();
    const charges = await db.charge.findMany({
      where: { status: "PENDING", dueDate: { lt: now } },
      include: { family: { include: { guardians: true } } },
      orderBy: { dueDate: "asc" },
    });

    return charges.map((charge) => ({
      id: charge.id,
      familyReferenceCode: charge.family.referenceCode,
      familyGuardianNames: charge.family.guardians.map((guardian) => guardian.name),
      concept: charge.concept,
      amount: charge.amount.toNumber(),
      dueDate: charge.dueDate,
      daysOverdue: Math.floor((now.getTime() - charge.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  });
}

export const createExpenseForecastSchema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria").max(200),
  amount: z.number().positive("El importe debe ser mayor que 0"),
  expectedDate: z.coerce.date(),
});

export type CreateExpenseForecastInput = z.infer<typeof createExpenseForecastSchema>;

export async function createExpenseForecast(
  ampaId: string,
  input: CreateExpenseForecastInput,
): Promise<{ id: string }> {
  const parsed = createExpenseForecastSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const expense = await db.expenseForecast.create({
      data: {
        ampaId: scopedAmpaId,
        description: parsed.description,
        amount: parsed.amount,
        expectedDate: parsed.expectedDate,
      },
    });
    return { id: expense.id };
  });
}

export interface ExpenseForecastSummary {
  id: string;
  description: string;
  amount: number;
  expectedDate: Date;
  status: string;
}

export async function listExpenseForecasts(ampaId: string): Promise<ExpenseForecastSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const expenses = await db.expenseForecast.findMany({ orderBy: { expectedDate: "asc" } });
    return expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amount: expense.amount.toNumber(),
      expectedDate: expense.expectedDate,
      status: expense.status,
    }));
  });
}

export const markExpenseForecastPaidSchema = z.object({ expenseForecastId: z.string().min(1) });

export async function markExpenseForecastPaid(ampaId: string, input: { expenseForecastId: string }): Promise<void> {
  const parsed = markExpenseForecastPaidSchema.parse(input);

  await withAmpaScope(ampaId, async (db) => {
    const expense = await db.expenseForecast.findUnique({ where: { id: parsed.expenseForecastId } });
    if (!expense) throw new Error("Gasto previsto no encontrado para esta AMPA");
    if (expense.status === "PAID") throw new Error("Este gasto ya está marcado como pagado");

    await db.expenseForecast.update({ where: { id: expense.id }, data: { status: "PAID" } });
  });
}

export interface MonthlyCashFlow {
  month: string; // "2026-09"
  income: number;
  expenses: number;
  net: number;
}

const FORECAST_MONTHS_AHEAD = 6;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Previsión de tesorería de los próximos `FORECAST_MONTHS_AHEAD` meses:
 * ingresos esperados (cargos `PENDING`, agrupados por mes de vencimiento) y
 * gastos previstos (`ExpenseForecast` `PLANNED`, agrupados por mes de fecha
 * esperada), con el neto mes a mes. No incluye lo que ya está `PAID` en
 * ninguno de los dos lados — es previsión de lo que falta por moverse, no un
 * histórico.
 */
export async function getCashFlowForecast(ampaId: string): Promise<MonthlyCashFlow[]> {
  return withAmpaScope(ampaId, async (db) => {
    const now = new Date();
    const horizonEnd = new Date(now.getFullYear(), now.getMonth() + FORECAST_MONTHS_AHEAD, 1);

    // En serie, nunca `Promise.all` — una única transacción/conexión reservada
    // por `withAmpaScope` (ver lección documentada en src/lib/export.ts).
    const pendingCharges = await db.charge.findMany({
      where: { status: "PENDING", dueDate: { lt: horizonEnd } },
    });
    const plannedExpenses = await db.expenseForecast.findMany({
      where: { status: "PLANNED", expectedDate: { lt: horizonEnd } },
    });

    const months: string[] = [];
    for (let i = 0; i < FORECAST_MONTHS_AHEAD; i++) {
      months.push(monthKey(new Date(now.getFullYear(), now.getMonth() + i, 1)));
    }

    const incomeByMonth = new Map<string, number>();
    for (const charge of pendingCharges) {
      const key = monthKey(charge.dueDate);
      incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + charge.amount.toNumber());
    }

    const expensesByMonth = new Map<string, number>();
    for (const expense of plannedExpenses) {
      const key = monthKey(expense.expectedDate);
      expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + expense.amount.toNumber());
    }

    return months.map((month) => {
      const income = incomeByMonth.get(month) ?? 0;
      const expenses = expensesByMonth.get(month) ?? 0;
      return { month, income, expenses, net: income - expenses };
    });
  });
}
