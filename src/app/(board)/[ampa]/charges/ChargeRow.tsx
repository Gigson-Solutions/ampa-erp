"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordManualPaymentAction } from "./actions";
import type { PendingChargeSummary } from "@/lib/board-directory";
import { formatCurrency } from "@/lib/format";
import { TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";

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
        <div className="flex items-center gap-2">
          <Select
            className="h-8 w-auto"
            value={method}
            onChange={(event) => setMethod(event.target.value as "TRANSFER" | "CASH")}
          >
            <option value="TRANSFER">{t("methodTransfer")}</option>
            <option value="CASH">{t("methodCash")}</option>
          </Select>
          <Button type="button" size="xs" onClick={handleMarkPaid} disabled={status === "submitting"}>
            {status === "submitting" ? t("submitting") : t("markPaid")}
          </Button>
        </div>
        {status === "error" && error && (
          <p role="alert" className="mt-1 text-xs text-danger-fg">
            {error}
          </p>
        )}
      </TD>
    </TR>
  );
}
