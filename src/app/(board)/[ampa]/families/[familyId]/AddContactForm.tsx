"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addContactAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

// Libro de socios (feedback de usuario, 2026-08-11): una persona de contacto
// NO es socio/a de la asociación — no exige DNI ni dirección, a diferencia del
// tutor legal que se registra en el alta inicial (ver AddStudentForm.tsx para
// el patrón equivalente de "añadir hijo/a").
export function AddContactForm({ familyId }: { familyId: string }): React.ReactElement {
  const t = useTranslations("board.familyDetail");
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await addContactAction(familyId, { name, email, phone: phone || undefined });

    if (result.ok) {
      setStatus("idle");
      setName("");
      setEmail("");
      setPhone("");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("addContactError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FormField>
        <Label htmlFor="new-contact-name">{t("contactName")}</Label>
        <Input id="new-contact-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="new-contact-email">{t("contactEmail")}</Label>
        <Input
          id="new-contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField>
        <Label htmlFor="new-contact-phone">{t("contactPhone")}</Label>
        <Input id="new-contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" variant="secondary" size="sm" disabled={status === "submitting"} className="self-start">
        {status === "submitting" ? t("submitting") : t("addContact")}
      </Button>
    </form>
  );
}
