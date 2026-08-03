import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 1 (ver roadmap): "cargos y pagos (Stripe + remesa SEPA + transferencia +
// efectivo)". Esta pieza cubre solo transferencia/efectivo — registro MANUAL de un
// pago ya recibido fuera de la plataforma, acción de tesorería. Stripe Connect y
// SEPA (cobro real, no solo registro) quedan para cuando haya credenciales reales
// que probar contra un entorno de test (ver src/lib/payments/stripe.ts y
// src/lib/sepa/*, todavía placeholders).

export const recordManualPaymentSchema = z.object({
  chargeId: z.string().min(1),
  method: z.enum(["TRANSFER", "CASH"]),
  paidAt: z.coerce.date().optional(),
});

export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;

export interface RecordManualPaymentResult {
  paymentId: string;
  amount: number;
}

const NON_PAYABLE_STATUSES = new Set(["PAID", "CANCELLED"]);

/**
 * Registra el cobro completo de un cargo ya emitido, fuera de Stripe/SEPA
 * (transferencia bancaria o efectivo verificados manualmente por tesorería). Marca
 * el `Charge` como `PAID` — no admite pagos parciales en esta primera versión (un
 * cargo se cobra entero o no se cobra).
 */
export async function recordManualPayment(
  ampaId: string,
  input: RecordManualPaymentInput,
): Promise<RecordManualPaymentResult> {
  const parsed = recordManualPaymentSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const charge = await db.charge.findUnique({ where: { id: parsed.chargeId } });
    if (!charge) throw new Error("Cargo no encontrado para esta AMPA");
    if (NON_PAYABLE_STATUSES.has(charge.status)) {
      throw new Error(`El cargo ya está en estado "${charge.status}" y no admite un nuevo pago`);
    }

    const paidAt = parsed.paidAt ?? new Date();

    const payment = await db.payment.create({
      data: {
        ampaId: scopedAmpaId,
        chargeId: charge.id,
        method: parsed.method,
        amount: charge.amount,
        status: "SETTLED",
        paidAt,
      },
    });

    await db.charge.update({ where: { id: charge.id }, data: { status: "PAID" } });

    return { paymentId: payment.id, amount: charge.amount.toNumber() };
  });
}
