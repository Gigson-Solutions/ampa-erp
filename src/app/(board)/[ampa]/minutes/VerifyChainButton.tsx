"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { verifyMinutesChainAction } from "./actions";
import type { MinutesChainVerification } from "@/lib/minutes";

export function VerifyChainButton(): React.ReactElement {
  const t = useTranslations("board.minutes");
  const [result, setResult] = useState<MinutesChainVerification | null>(null);
  const [status, setStatus] = useState<"idle" | "checking">("idle");

  async function handleVerify(): Promise<void> {
    setStatus("checking");
    const verification = await verifyMinutesChainAction();
    setResult(verification);
    setStatus("idle");
  }

  return (
    <div>
      <button type="button" onClick={handleVerify} disabled={status === "checking"}>
        {status === "checking" ? t("verifying") : t("verifyChain")}
      </button>
      {result && (
        <p role={result.valid ? "status" : "alert"} className="mt-2">
          {result.valid
            ? `${t("chainValid")} (${result.entryCount})`
            : `${t("chainBroken")} #${result.brokenAtSequence}: ${result.reason}`}
        </p>
      )}
    </div>
  );
}
