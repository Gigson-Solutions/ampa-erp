"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createMembershipAction } from "./actions";

// Fase 1, primera versión: IDs en texto plano (familyId/feeSchemaId/academicYearId)
// en vez de selectores de búsqueda — pendiente de mejorar la UX con autocompletado
// cuando exista un listado de familias/cuotas navegable (fuera de alcance de esta
// pieza vertical).
export function CreateMembershipForm(): React.ReactElement {
  const t = useTranslations("board.memberships");

  const [familyId, setFamilyId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [feeSchemaId, setFeeSchemaId] = useState("");
  const [siblingCount, setSiblingCount] = useState(0);
  const [isLargeFamily, setIsLargeFamily] = useState(false);
  const [scholarshipDiscountPercent, setScholarshipDiscountPercent] = useState(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const result = await createMembershipAction({
      familyId,
      academicYearId,
      feeSchemaId,
      familyDiscounts: { siblingCount, isLargeFamily, scholarshipDiscountPercent },
    });

    if (result.ok) {
      setStatus("success");
      setMessage(`${t("success")} ${result.amount}€`);
    } else {
      setStatus("error");
      setMessage(result.error ?? t("genericError"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="familyId">{t("familyId")}</label>
        <input id="familyId" required value={familyId} onChange={(e) => setFamilyId(e.target.value)} />
      </div>
      <div>
        <label htmlFor="academicYearId">{t("academicYearId")}</label>
        <input
          id="academicYearId"
          required
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="feeSchemaId">{t("feeSchemaId")}</label>
        <input id="feeSchemaId" required value={feeSchemaId} onChange={(e) => setFeeSchemaId(e.target.value)} />
      </div>
      <div>
        <label htmlFor="siblingCount">{t("siblingCount")}</label>
        <input
          id="siblingCount"
          type="number"
          min={0}
          value={siblingCount}
          onChange={(e) => setSiblingCount(Number(e.target.value))}
        />
      </div>
      <label>
        <input type="checkbox" checked={isLargeFamily} onChange={(e) => setIsLargeFamily(e.target.checked)} />
        {t("isLargeFamily")}
      </label>
      <div>
        <label htmlFor="scholarshipDiscountPercent">{t("scholarshipDiscountPercent")}</label>
        <input
          id="scholarshipDiscountPercent"
          type="number"
          min={0}
          max={100}
          value={scholarshipDiscountPercent}
          onChange={(e) => setScholarshipDiscountPercent(Number(e.target.value))}
        />
      </div>

      {message && <p role={status === "error" ? "alert" : "status"}>{message}</p>}

      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
