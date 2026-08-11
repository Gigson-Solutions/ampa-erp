"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordManualPaymentAction } from "./actions";
import type { PendingChargeSummary } from "@/lib/board-directory";
import { formatCurrency } from "@/lib/format";
import { TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";

// Feedback de usuario (2026-08-11): antes había que elegir el método de pago
// aquí para cada cargo — se ha movido al alta de la membresía (para el caso
// de pago inmediato). Un pago registrado DESDE AQUÍ es casi siempre diferido
// (la familia paga semanas después de que venza el cargo, normalmente por
// transferencia vista en el extracto bancario) — se usa "TRANSFER" por
// defecto, sin pedir que se elija en cada fila.
const DEFAULT_DEFERRED_PAYMENT_METHOD = "TRANSFER" as const;

export function ChargeRow({ charge }: { charge: PendingChargeSummary }): React.ReactElement {
  const t = useTranslations("board.charges");
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid(): Promise<void> {
    setStatus("submitting");
    setError(null);

    const result = await recordManualPaymentAction({
      chargeId: charge.id,
      method: DEFAULT_DEFERRED_PAYMENT_METHOD,
    });

    if (result.ok) {
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <TR>
      <TD>
        <div className="font-medium text-ink-900">
          {charge.familyGuardianNames.join(", ") || charge.familyReferenceCode}
        </div>
        <div className="text-xs text-ink-400">{charge.familyReferenceCode}</div>
      </TD>
      <TD>{charge.concept}</TD>
      <TD>{formatCurrency(charge.amount)}</TD>
      <TD>{new Date(charge.dueDate).toLocaleDateString("es-ES")}</TD>
      <TD>
        <Button type="button" size="xs" onClick={handleMarkPaid} disabled={status === "submitting"}>
          {status === "submitting" ? t("submitting") : t("markPaid")}
        </Button>
        {status === "error" && error && (
          <p role="alert" className="mt-1 text-xs text-danger-fg">
            {error}
          </p>
        )}
      </TD>
    </TR>
  );
}
