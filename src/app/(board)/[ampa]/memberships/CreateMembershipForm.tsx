"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createMembershipAction } from "./actions";
import type { FamilySummary, FeeSchemaSummary } from "@/lib/board-directory";

interface CreateMembershipFormProps {
  families: FamilySummary[];
  feeSchemas: FeeSchemaSummary[];
  preselectedFamilyId?: string;
}

// Antes pedía familyId/academicYearId/feeSchemaId en texto plano — ahora usa los
// listados reales de la AMPA (ver src/lib/board-directory.ts) como desplegables.
// `academicYearId` ya no se pide: se deriva siempre del FeeSchema elegido (ver
// src/lib/membership.ts).
export function CreateMembershipForm({
  families,
  feeSchemas,
  preselectedFamilyId,
}: CreateMembershipFormProps): React.ReactElement {
  const t = useTranslations("board.memberships");

  const validPreselected =
    preselectedFamilyId && families.some((family) => family.id === preselectedFamilyId)
      ? preselectedFamilyId
      : undefined;
  const [familyId, setFamilyId] = useState(validPreselected ?? families[0]?.id ?? "");
  const [feeSchemaId, setFeeSchemaId] = useState(feeSchemas[0]?.id ?? "");
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

  if (families.length === 0 || feeSchemas.length === 0) {
    return <p role="alert">{t("emptyDirectories")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="familyId">{t("familyId")}</label>
        <select id="familyId" required value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
          {families.map((family) => (
            <option key={family.id} value={family.id}>
              {family.referenceCode} — {family.guardianNames.join(", ") || "(sin tutor/a)"} (
              {family.studentCount} alumno/s)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="feeSchemaId">{t("feeSchemaId")}</label>
        <select id="feeSchemaId" required value={feeSchemaId} onChange={(e) => setFeeSchemaId(e.target.value)}>
          {feeSchemas.map((feeSchema) => (
            <option key={feeSchema.id} value={feeSchema.id}>
              {feeSchema.academicYearLabel} — {feeSchema.name} ({feeSchema.amount}€)
            </option>
          ))}
        </select>
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
