"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { registerFamilyAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

interface StudentField {
  name: string;
}

export function RegisterFamilyForm({ ampaSubdomain }: { ampaSubdomain: string }): React.ReactElement {
  const t = useTranslations("register");

  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [students, setStudents] = useState<StudentField[]>([{ name: "" }]);
  const [consentData, setConsentData] = useState(false);
  const [consentImage, setConsentImage] = useState(false);
  const [consentCenterShare, setConsentCenterShare] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [cardToken, setCardToken] = useState<string | null>(null);

  function updateStudentName(index: number, name: string): void {
    setStudents((prev) => prev.map((student, i) => (i === index ? { name } : student)));
  }

  function addStudent(): void {
    setStudents((prev) => [...prev, { name: "" }]);
  }

  function removeStudent(index: number): void {
    setStudents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const result = await registerFamilyAction(ampaSubdomain, {
      guardian: {
        name: guardianName,
        email: guardianEmail,
        phone: guardianPhone || undefined,
      },
      students: students.map((student) => ({ name: student.name })),
      consents: {
        data: consentData as true,
        image: consentImage,
        centerShare: consentCenterShare,
      },
    });

    if (result.ok) {
      setStatus("success");
      setMessage(`${t("success")} ${result.referenceCode}`);
      setCardToken(result.cardToken ?? null);
    } else {
      setStatus("error");
      setMessage(result.error ?? t("genericError"));
    }
  }

  if (status === "success") {
    return (
      <div>
        <Alert variant="success">{message}</Alert>
        {cardToken && (
          <p className="mt-3">
            <a href={`/${ampaSubdomain}/carnet/${cardToken}`} className="text-sm font-medium text-brand-500 hover:underline">
              {t("viewCard")}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField>
        <Label htmlFor="guardianName">{t("guardianName")}</Label>
        <Input
          id="guardianName"
          required
          value={guardianName}
          onChange={(event) => setGuardianName(event.target.value)}
        />
      </FormField>

      <FormField>
        <Label htmlFor="guardianEmail">{t("guardianEmail")}</Label>
        <Input
          id="guardianEmail"
          type="email"
          required
          value={guardianEmail}
          onChange={(event) => setGuardianEmail(event.target.value)}
        />
      </FormField>

      <FormField>
        <Label htmlFor="guardianPhone">{t("guardianPhone")}</Label>
        <Input
          id="guardianPhone"
          value={guardianPhone}
          onChange={(event) => setGuardianPhone(event.target.value)}
        />
      </FormField>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        {students.map((student, index) => (
          <div key={index} className="flex items-end gap-2">
            <FormField className="flex-1">
              <Label htmlFor={`student-${index}`}>{t("studentName")}</Label>
              <Input
                id={`student-${index}`}
                required
                value={student.name}
                onChange={(event) => updateStudentName(index, event.target.value)}
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
        <p className="text-sm text-ink-700">{t("consentDataHint")}</p>
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            required
            checked={consentData}
            onChange={(event) => setConsentData(event.target.checked)}
            className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
          />
          {t("accept")}
        </label>
      </fieldset>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-ink-900">{t("consentImageTitle")}</legend>
        <p className="text-sm text-ink-700">{t("consentImageHint")}</p>
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={consentImage}
            onChange={(event) => setConsentImage(event.target.checked)}
            className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
          />
          {t("accept")}
        </label>
      </fieldset>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-ink-900">{t("consentCenterShareTitle")}</legend>
        <p className="text-sm text-ink-700">{t("consentCenterShareHint")}</p>
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={consentCenterShare}
            onChange={(event) => setConsentCenterShare(event.target.checked)}
            className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
          />
          {t("accept")}
        </label>
      </fieldset>

      {status === "error" && message && <Alert variant="error">{message}</Alert>}

      <Button type="submit" disabled={status === "submitting"} size="md">
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
