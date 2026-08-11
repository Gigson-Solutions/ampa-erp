"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { recordManualPayment, type RecordManualPaymentInput } from "@/lib/payments";
import {
  createExpenseForecast,
  markExpenseForecastPaid,
  type CreateExpenseForecastInput,
} from "@/lib/treasury";

export interface RecordManualPaymentActionResult {
  ok: boolean;
  error?: string;
  amount?: number;
}

export async function recordManualPaymentAction(
  input: RecordManualPaymentInput,
): Promise<RecordManualPaymentActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_TREASURY");

  try {
    const result = await recordManualPayment(ampaId, input);
    return { ok: true, amount: result.amount };
  } catch (error) {
    console.error("recordManualPaymentAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo registrar el pago.";
    return { ok: false, error: message };
  }
}

export interface CreateExpenseForecastActionResult {
  ok: boolean;
  error?: string;
}

export async function createExpenseForecastAction(
  input: CreateExpenseForecastInput,
): Promise<CreateExpenseForecastActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_TREASURY");

  try {
    await createExpenseForecast(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("createExpenseForecastAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo guardar el gasto previsto.";
    return { ok: false, error: message };
  }
}

export interface MarkExpenseForecastPaidActionResult {
  ok: boolean;
  error?: string;
}

export async function markExpenseForecastPaidAction(
  expenseForecastId: string,
): Promise<MarkExpenseForecastPaidActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_TREASURY");

  try {
    await markExpenseForecastPaid(ampaId, { expenseForecastId });
    return { ok: true };
  } catch (error) {
    console.error("markExpenseForecastPaidAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo marcar el gasto como pagado.";
    return { ok: false, error: message };
  }
}
