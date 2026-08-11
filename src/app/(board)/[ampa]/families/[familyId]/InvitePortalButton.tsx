"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { invitePortalAction } from "./actions";
import { Button } from "@/components/ui/Button";

interface InvitePortalButtonProps {
  guardianId: string;
  ampaSubdomain: string;
}

// Portal de familias (Feedback #5, 2026-08-11): dos pasos — (1) el servidor
// prepara el acceso (User + rol FAMILIA, ver invitePortalAction), (2) el
// cliente dispara el envío real del magic link con signIn(), igual que
// LoginForm.tsx. Esto es también lo que cierra el punto 2 de Feedback #1 (el
// "email con el alta y el registro" tras dar de alta una familia desde
// el panel de junta).
export function InvitePortalButton({ guardianId, ampaSubdomain }: InvitePortalButtonProps): React.ReactElement {
  const t = useTranslations("board.familyDetail");
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    setStatus("submitting");
    setError(null);

    const result = await invitePortalAction(guardianId);
    if (!result.ok || !result.email) {
      setStatus("error");
      setError(result.error ?? t("invitePortalError"));
      return;
    }

    await signIn("nodemailer", {
      email: result.email,
      redirect: false,
      callbackUrl: `/${ampaSubdomain}/portal`,
    });
    setStatus("sent");
    router.refresh();
  }

  if (status === "sent") {
    return <span className="text-xs text-success-fg">{t("invitePortalSent")}</span>;
  }

  return (
    <div>
      <Button type="button" variant="tertiary" size="xs" onClick={() => void handleClick()} disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("invitePortal")}
      </Button>
      {status === "error" && error && <p className="mt-1 text-xs text-danger-fg">{error}</p>}
    </div>
  );
}
