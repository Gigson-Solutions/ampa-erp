"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cancelEnrollmentAction } from "../actions";

export function CancelEnrollmentButton({ enrollmentId }: { enrollmentId: string }): React.ReactElement {
  const t = useTranslations("board.activities");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting">("idle");

  async function handleCancel(): Promise<void> {
    setStatus("submitting");
    const result = await cancelEnrollmentAction(enrollmentId);
    if (result.ok) {
      router.refresh();
    } else {
      setStatus("idle");
      console.error(result.error);
    }
  }

  return (
    <button type="button" onClick={handleCancel} disabled={status === "submitting"}>
      {t("cancelEnrollment")}
    </button>
  );
}
