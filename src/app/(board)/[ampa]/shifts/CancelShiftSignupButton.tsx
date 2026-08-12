"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cancelShiftSignupAction } from "./actions";
import { Button } from "@/components/ui/Button";

export function CancelShiftSignupButton({ signupId }: { signupId: string }): React.ReactElement {
  const t = useTranslations("board.shifts");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  async function handleClick(): Promise<void> {
    setStatus("submitting");
    await cancelShiftSignupAction(signupId);
    router.refresh();
  }

  return (
    <Button type="button" variant="tertiary" size="xs" onClick={() => void handleClick()} disabled={status === "submitting"}>
      {t("cancelSignup")}
    </Button>
  );
}
