"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cancelEventRegistrationAction } from "../actions";

export function CancelRegistrationButton({ registrationId }: { registrationId: string }): React.ReactElement {
  const t = useTranslations("board.events");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  async function handleCancel(): Promise<void> {
    setStatus("submitting");
    const result = await cancelEventRegistrationAction(registrationId);
    if (result.ok) {
      router.refresh();
    } else {
      setStatus("idle");
      console.error(result.error);
    }
  }

  return (
    <button type="button" onClick={handleCancel} disabled={status === "submitting"}>
      {t("cancelRegistration")}
    </button>
  );
}
