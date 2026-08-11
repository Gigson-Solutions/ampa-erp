"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createMembershipAction } from "./actions";
import type { FamilySummary, FeeSchemaSummary } from "@/lib/board-directory";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label, Select } from "@/components/ui/Input";

// Solo se usan estos 4 campos aquí — `Pick` en vez de `FamilySummary` completo
// para que la ficha de familia (que no tiene `createdAt` a mano) pueda pasar un
// objeto mínimo sin tener que inventarse un valor de relleno.
type MembershipFamilyOption = Pick<FamilySummary, "id" | "referenceCode" | "guardianNames" | "studentCount">;

interface CreateMembershipFormProps {
  families: MembershipFamilyOption[];
  feeSchemas: FeeSchemaSummary[];
  preselectedFamilyId?: string;
  // Feedback de usuario (2026-08-11): desde la ficha de familia, la familia ya
  // está decidida por el propio contexto de la página — no tiene sentido volver
  // a pedirla en un `<select>`. `families` debe traer solo esa familia.
  hideFamilySelector?: boolean;
}

// Antes pedía familyId/academicYearId/feeSchemaId en texto plano — ahora usa los
// listados reales de la AMPA (ver src/lib/board-directory.ts) como desplegables.
// `academicYearId` ya no se pide: se deriva siempre del FeeSchema elegido (ver
// src/lib/membership.ts). El nº de hermanos tampoco se pide ya a mano: se deriva
// siempre del nº real de alumnos ya registrados en la familia seleccionada.
export function CreateMembershipForm({
  families,
  feeSchemas,
  preselectedFamilyId,
  hideFamilySelector = false,
}: CreateMembershipFormProps): React.ReactElement {
  const t = useTranslations("board.memberships");

  const validPreselected =
    preselectedFamilyId && families.some((family) => family.id === preselectedFamilyId)
      ? preselectedFamilyId
      : undefined;
  const [familyId, setFamilyId] = useState(validPreselected ?? families[0]?.id ?? "");
  const [feeSchemaId, setFeeSchemaId] = useState(feeSchemas[0]?.id ?? "");
  const [isLargeFamily, setIsLargeFamily] = useState(false);
  const [scholarshipDiscountPercent, setScholarshipDiscountPercent] = useState(0);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFER" | "CASH">("TRANSFER");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const selectedFamily = useMemo(() => families.find((family) => family.id === familyId), [families, familyId]);
  // "Nº de hermanos" para el descuento = nº de alumnos de la familia menos el
  // propio alumno/a al que se le aplica la cuota (nunca negativo).
  const siblingCount = Math.max(0, (selectedFamily?.studentCount ?? 1) - 1);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const result = await createMembershipAction({
      familyId,
      feeSchemaId,
      familyDiscounts: { siblingCount, isLargeFamily, scholarshipDiscountPercent },
      payment: alreadyPaid ? { method: paymentMethod } : undefined,
    });

    if (result.ok) {
      setStatus("success");
      setMessage(`${t("success")} ${formatCurrency(result.amount ?? 0)}`);
    } else {
      setStatus("error");
      setMessage(result.error ?? t("genericError"));
    }
  }

  if (families.length === 0 || feeSchemas.length === 0) {
    return <Alert variant="error">{t("emptyDirectories")}</Alert>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {hideFamilySelector ? (
        <p className="text-sm text-ink-700">
          {t("familyId")}: <span className="font-medium text-ink-900">{selectedFamily?.referenceCode}</span> —{" "}
          {selectedFamily?.guardianNames.join(", ") || "(sin tutor/a)"}
        </p>
      ) : (
        <FormField>
          <Label htmlFor="familyId">{t("familyId")}</Label>
          <Select id="familyId" required value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.referenceCode} — {family.guardianNames.join(", ") || "(sin tutor/a)"} (
                {family.studentCount} alumno/s)
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField>
        <Label htmlFor="feeSchemaId">{t("feeSchemaId")}</Label>
        <Select id="feeSchemaId" required value={feeSchemaId} onChange={(e) => setFeeSchemaId(e.target.value)}>
          {feeSchemas.map((feeSchema) => (
            <option key={feeSchema.id} value={feeSchema.id}>
              {feeSchema.academicYearLabel} — {feeSchema.name} ({formatCurrency(feeSchema.amount)})
            </option>
          ))}
        </Select>
      </FormField>

      <p className="text-sm text-ink-700">
        {t("siblingCount")}: <span className="font-medium text-ink-900">{siblingCount}</span>{" "}
        <span className="text-ink-400">({t("siblingCountAuto")})</span>
      </p>

      <label className="flex items-center gap-2 text-sm text-ink-900">
        <input
          type="checkbox"
          checked={isLargeFamily}
          onChange={(e) => setIsLargeFamily(e.target.checked)}
          className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
        />
        {t("isLargeFamily")}
      </label>

      <FormField>
        <Label htmlFor="scholarshipDiscountPercent">{t("scholarshipDiscountPercent")}</Label>
        <Input
          id="scholarshipDiscountPercent"
          type="number"
          min={0}
          max={100}
          value={scholarshipDiscountPercent}
          onChange={(e) => setScholarshipDiscountPercent(Number(e.target.value))}
        />
      </FormField>

      {/* Feedback de usuario (2026-08-11): el método de pago se elige aquí, en
          el alta del cargo, para el caso de pago inmediato — no en el listado
          de /charges (que ahora solo tiene un botón simple para el caso de
          pago diferido, el más habitual). */}
      <div className="rounded-lg border border-border p-4">
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={alreadyPaid}
            onChange={(e) => setAlreadyPaid(e.target.checked)}
            className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
          />
          {t("alreadyPaid")}
        </label>
        {alreadyPaid && (
          <FormField className="mt-3">
            <Label htmlFor="paymentMethod">{t("paymentMethod")}</Label>
            <Select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "TRANSFER" | "CASH")}
            >
              <option value="TRANSFER">{t("methodTransfer")}</option>
              <option value="CASH">{t("methodCash")}</option>
            </Select>
          </FormField>
        )}
      </div>

      {message && <Alert variant={status === "error" ? "error" : "success"}>{message}</Alert>}

      <Button type="submit" disabled={status === "submitting"} size="md">
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
