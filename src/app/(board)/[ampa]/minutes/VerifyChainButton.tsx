"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { verifyMinutesChainAction } from "./actions";
import type { MinutesChainVerification } from "@/lib/minutes";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
    <div className="flex items-center gap-3">
      {result && (
        <Badge variant={result.valid ? "success" : "danger"}>
          {result.valid
            ? `${t("chainValid")} (${result.entryCount})`
            : `${t("chainBroken")} #${result.brokenAtSequence}: ${result.reason}`}
        </Badge>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={handleVerify} disabled={status === "checking"}>
        <ShieldCheck size={16} />
        {status === "checking" ? t("verifying") : t("verifyChain")}
      </Button>
    </div>
  );
}
