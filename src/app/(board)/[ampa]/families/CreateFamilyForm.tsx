"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createFamilyAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

interface StudentField {
  name: string;
}

// Alta de familia desde el panel de junta (feedback de usuario, 2026-08-11) —
// mismo formulario/contrato que el alta pública (`(public)/[ampa]/alta`), para
// altas presenciales/en papel. Deliberadamente NO comparte componente con
// `RegisterFamilyForm` (aunque los campos coincidan) porque una vive en
// `(public)` y la otra en `(board)`, con acciones y gates de autorización
// distintos — duplicar este formulario simple es más claro que forzar una
// abstracción compartida entre dos árboles de rutas con permisos diferentes.
export function CreateFamilyForm(): React.ReactElement {
  const t = useTranslations("board.newFamily");
  const router = useRouter();

  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianDni, setGuardianDni] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [students, setStudents] = useState<StudentField[]>([{ name: "" }]);
  const [consentData, setConsentData] = useState(false);
  const [consentImage, setConsentImage] = useState(false);
  const [consentCenterShare, setConsentCenterShare] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function updateStudentName(index: number, name: string): void {
    setStudents((prev) => prev.map((student, i) => (i === index ? { name } : student)));
  }

  function addStudent(): void {
    setStudents((prev) => [...prev, { name: "" }]);
  }

  function removeStudent(index: number): void {
    setStudents((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm(): void {
    setGuardianName("");
    setGuardianEmail("");
    setGuardianPhone("");
    setGuardianDni("");
    setGuardianAddress("");
    setStudents([{ name: "" }]);
    setConsentData(false);
    setConsentImage(false);
    setConsentCenterShare(false);
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const result = await createFamilyAction({
      guardian: {
        name: guardianName,
        email: guardianEmail,
        phone: guardianPhone || undefined,
        dni: guardianDni,
        address: guardianAddress,
      },
      students: students.map((student) => ({ name: student.name })),
      consents: {
        data: consentData as true,
        image: consentImage,
        centerShare: consentCenterShare,
      },
    });

    if (result.ok) {
      setStatus("idle");
      setMessage(`${t("success")} ${result.referenceCode}`);
      resetForm();
      router.refresh();
    } else {
      setStatus("error");
      setMessage(result.error ?? t("genericError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField>
          <Label htmlFor="new-family-guardian-name">{t("guardianName")}</Label>
          <Input
            id="new-family-guardian-name"
            required
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
          />
        </FormField>
        <FormField>
          <Label htmlFor="new-family-guardian-email">{t("guardianEmail")}</Label>
          <Input
            id="new-family-guardian-email"
            type="email"
            required
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
          />
        </FormField>
        <FormField>
          <Label htmlFor="new-family-guardian-phone">{t("guardianPhone")}</Label>
          <Input
            id="new-family-guardian-phone"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
          />
        </FormField>
        <FormField>
          <Label htmlFor="new-family-guardian-dni">{t("guardianDni")}</Label>
          <Input
            id="new-family-guardian-dni"
            required
            value={guardianDni}
            onChange={(e) => setGuardianDni(e.target.value)}
          />
        </FormField>
        <FormField className="col-span-2">
          <Label htmlFor="new-family-guardian-address">{t("guardianAddress")}</Label>
          <Input
            id="new-family-guardian-address"
            required
            value={guardianAddress}
            onChange={(e) => setGuardianAddress(e.target.value)}
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        {students.map((student, index) => (
          <div key={index} className="flex items-end gap-2">
            <FormField className="flex-1">
              <Label htmlFor={`new-family-student-${index}`}>{t("studentName")}</Label>
              <Input
                id={`new-family-student-${index}`}
                required
                value={student.name}
                onChange={(e) => updateStudentName(index, e.target.value)}
              />
            </FormField>
            {students.length > 1 && (
              <Button type="button" variant="tertiary" size="sm" onClick={() => removeStudent(index)}>
                {t("removeStudent")}
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={addStudent} className="self-start">
          {t("addStudent")}
        </Button>
      </div>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-ink-900">{t("consentDataTitle")}</legend>
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            required
            checked={consentData}
            onChange={(e) => setConsentData(e.target.checked)}
            className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
          />
          {t("consentDataLabel")}
        </label>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={consentImage}
            onChange={(e) => setConsentImage(e.target.checked)}
            className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
          />
          {t("consentImageLabel")}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={consentCenterShare}
            onChange={(e) => setConsentCenterShare(e.target.checked)}
            className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
          />
          {t("consentCenterShareLabel")}
        </label>
      </div>

      {message && <Alert variant={status === "error" ? "error" : "success"}>{message}</Alert>}

      <Button type="submit" disabled={status === "submitting"} size="md" className="self-start">
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
