"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { recordManualPayment, type RecordManualPaymentInput } from "@/lib/payments";

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
