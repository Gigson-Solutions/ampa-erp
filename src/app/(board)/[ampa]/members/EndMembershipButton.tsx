"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { endMembershipAction } from "./actions";
import { Button } from "@/components/ui/Button";

export function EndMembershipButton({ guardianId }: { guardianId: string }): React.ReactElement {
  const t = useTranslations("board.members");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    if (!window.confirm(t("endMembershipConfirm"))) return;
    setStatus("submitting");
    setError(null);

    const result = await endMembershipAction(guardianId);
    if (result.ok) {
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  return (
    <div>
      <Button type="button" variant="tertiary" size="xs" onClick={() => void handleClick()} disabled={status === "submitting"}>
        {t("endMembership")}
      </Button>
      {status === "error" && error && <p className="mt-1 text-xs text-danger-fg">{error}</p>}
    </div>
  );
}
