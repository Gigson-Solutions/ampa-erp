"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addStudentAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

export function AddStudentForm({ familyId }: { familyId: string }): React.ReactElement {
  const t = useTranslations("board.familyDetail");
  const router = useRouter();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await addStudentAction(familyId, {
      name,
      birthDate: birthDate ? new Date(birthDate) : undefined,
    });

    if (result.ok) {
      setStatus("idle");
      setName("");
      setBirthDate("");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("addStudentError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FormField>
        <Label htmlFor="new-student-name">{t("studentName")}</Label>
        <Input id="new-student-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="new-student-birthdate">{t("studentBirthDate")}</Label>
        <Input
          id="new-student-birthdate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </FormField>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" variant="secondary" size="sm" disabled={status === "submitting"} className="self-start">
        {status === "submitting" ? t("submitting") : t("addStudent")}
      </Button>
    </form>
  );
}
