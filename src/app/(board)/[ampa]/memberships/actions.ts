"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { createMembershipWithCharge, type CreateMembershipInput } from "@/lib/membership";
import { recordManualPayment } from "@/lib/payments";

export interface CreateMembershipActionResult {
  ok: boolean;
  error?: string;
  chargeId?: string;
  amount?: number;
}

export interface CreateMembershipActionInput extends CreateMembershipInput {
  // Feedback de usuario (2026-08-11): "el método de pago debería estar dentro
  // del alta del cargo" — cubre el caso de que la familia pague en el momento
  // (efectivo/transferencia confirmada ahí mismo), sin tener que ir después a
  // `/charges` a marcarlo pagado por separado. Opcional: si no se manda, el
  // cargo queda `PENDING` igual que siempre.
  payment?: { method: "TRANSFER" | "CASH" };
}

export async function createMembershipAction(
  input: CreateMembershipActionInput,
): Promise<CreateMembershipActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");

  try {
    const { payment, ...membershipInput } = input;
    const result = await createMembershipWithCharge(ampaId, membershipInput);

    // En serie, nunca en paralelo con la creación anterior — withAmpaScope abre
    // una transacción/conexión distinta en cada llamada (ver CLAUDE.md > lección
    // de export.ts sobre Promise.all dentro de una misma operación de escritura).
    if (payment) {
      await recordManualPayment(ampaId, { chargeId: result.chargeId, method: payment.method });
    }

    return { ok: true, chargeId: result.chargeId, amount: result.amount };
  } catch (error) {
    console.error("createMembershipAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo crear la membresía.";
    return { ok: false, error: message };
  }
}
