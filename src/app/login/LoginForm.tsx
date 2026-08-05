"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

// Conecta el login por magic link (proveedor "nodemailer", sustituido por Amazon
// SES — ver src/lib/mail/ses.ts). En desarrollo, sin credenciales AWS, el enlace se
// imprime en la consola de `pnpm dev` en vez de enviarse por email de verdad.
export function LoginForm(): React.ReactElement {
  const t = useTranslations("common");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    try {
      await signIn("nodemailer", { email, redirect: false });
      setStatus("sent");
    } catch (error) {
      console.error("signIn failed:", error);
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <Alert variant="success">{t("loginHint")}</Alert>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>
      <Button type="submit" disabled={status === "submitting"} size="md">
        {t("loginButton")}
      </Button>
      {status === "error" && <Alert variant="error">Error al enviar el enlace.</Alert>}
    </form>
  );
}
