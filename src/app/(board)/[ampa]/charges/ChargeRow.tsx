"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordManualPaymentAction } from "./actions";
import type { PendingChargeSummary } from "@/lib/board-directory";

export function ChargeRow({ charge }: { charge: PendingChargeSummary }): React.ReactElement {
  const t = useTranslations("board.charges");
  const router = useRouter();

  const [method, setMethod] = useState<"TRANSFER" | "CASH">("TRANSFER");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid(): Promise<void> {
    setStatus("submitting");
    setError(null);

    const result = await recordManualPaymentAction({ chargeId: charge.id, method });

    if (result.ok) {
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <tr>
      <td>{charge.familyReferenceCode}</td>
      <td>{charge.concept}</td>
      <td>{charge.amount}€</td>
      <td>{new Date(charge.dueDate).toLocaleDateString("es-ES")}</td>
      <td>
        <select value={method} onChange={(event) => setMethod(event.target.value as "TRANSFER" | "CASH")}>
          <option value="TRANSFER">{t("methodTransfer")}</option>
          <option value="CASH">{t("methodCash")}</option>
        </select>
        <button type="button" onClick={handleMarkPaid} disabled={status === "submitting"}>
          {status === "submitting" ? t("submitting") : t("markPaid")}
        </button>
        {status === "error" && error && <p role="alert">{error}</p>}
      </td>
    </tr>
  );
}
