"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { markExpenseForecastPaidAction } from "./actions";
import { Button } from "@/components/ui/Button";

export function MarkExpensePaidButton({ expenseForecastId }: { expenseForecastId: string }): React.ReactElement {
  const t = useTranslations("board.treasury");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    setStatus("submitting");
    setError(null);

    const result = await markExpenseForecastPaidAction(expenseForecastId);
    if (result.ok) {
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <div>
      <Button type="button" size="xs" onClick={() => void handleClick()} disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("markExpensePaid")}
      </Button>
      {status === "error" && error && <p className="mt-1 text-xs text-danger-fg">{error}</p>}
    </div>
  );
}
