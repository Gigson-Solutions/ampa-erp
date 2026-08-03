"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { registerFamilyAction } from "../actions";

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
        <p role="status">{message}</p>
        {cardToken && (
          <p className="mt-2">
            <a href={`/${ampaSubdomain}/carnet/${cardToken}`}>{t("viewCard")}</a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="guardianName">{t("guardianName")}</label>
        <input
          id="guardianName"
          required
          value={guardianName}
          onChange={(event) => setGuardianName(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="guardianEmail">{t("guardianEmail")}</label>
        <input
          id="guardianEmail"
          type="email"
          required
          value={guardianEmail}
          onChange={(event) => setGuardianEmail(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="guardianPhone">{t("guardianPhone")}</label>
        <input
          id="guardianPhone"
          value={guardianPhone}
          onChange={(event) => setGuardianPhone(event.target.value)}
        />
      </div>

      {students.map((student, index) => (
        <div key={index}>
          <label htmlFor={`student-${index}`}>{t("studentName")}</label>
          <input
            id={`student-${index}`}
            required
            value={student.name}
            onChange={(event) => updateStudentName(index, event.target.value)}
          />
          {students.length > 1 && (
            <button type="button" onClick={() => removeStudent(index)}>
              {t("removeStudent")}
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={addStudent}>
        {t("addStudent")}
      </button>

      <fieldset>
        <legend>{t("consentDataTitle")}</legend>
        <p>{t("consentDataHint")}</p>
        <label>
          <input type="checkbox" required checked={consentData} onChange={(event) => setConsentData(event.target.checked)} />
          {t("accept")}
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("consentImageTitle")}</legend>
        <p>{t("consentImageHint")}</p>
        <label>
          <input type="checkbox" checked={consentImage} onChange={(event) => setConsentImage(event.target.checked)} />
          {t("accept")}
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("consentCenterShareTitle")}</legend>
        <p>{t("consentCenterShareHint")}</p>
        <label>
          <input
            type="checkbox"
            checked={consentCenterShare}
            onChange={(event) => setConsentCenterShare(event.target.checked)}
          />
          {t("accept")}
        </label>
      </fieldset>

      {status === "error" && message && <p role="alert">{message}</p>}

      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
