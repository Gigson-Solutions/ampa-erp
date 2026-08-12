"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { assignGuardianAction } from "./actions";
import type { GuardianSummary } from "@/lib/board-directory";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label, Select } from "@/components/ui/Input";

interface AssignGuardianFormProps {
  shiftId: string;
  guardians: GuardianSummary[];
}

// Mismo patrón de buscador que EnrollStudentForm.tsx (Feedback #3): con
// muchas familias, un <select> plano de todas las personas se vuelve
// inmanejable — filtro en cliente por nombre.
export function AssignGuardianForm({ shiftId, guardians }: AssignGuardianFormProps): React.ReactElement {
  const t = useTranslations("board.shifts");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return guardians;
    return guardians.filter((guardian) => guardian.name.toLowerCase().includes(query));
  }, [guardians, search]);
  const [guardianId, setGuardianId] = useState(guardians[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const effectiveGuardianId = filtered.some((g) => g.id === guardianId) ? guardianId : filtered[0]?.id;
    if (!effectiveGuardianId) return;

    const result = await assignGuardianAction({ shiftId, guardianId: effectiveGuardianId });
    if (result.ok) {
      setStatus("idle");
      setMessage(result.status === "WAITLISTED" ? t("waitlisted") : t("signedUp"));
      router.refresh();
    } else {
      setStatus("error");
      setMessage(result.error ?? t("genericError"));
    }
  }

  if (guardians.length === 0) {
    return <Alert variant="error">{t("noGuardians")}</Alert>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchGuardianPlaceholder")}
          className="flex-1"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-ink-700">{t("noGuardiansMatch")}</p>
      ) : (
        <FormField>
          <Label htmlFor={`assign-guardian-${shiftId}`} className="sr-only">
            {t("assignGuardian")}
          </Label>
          <Select
            id={`assign-guardian-${shiftId}`}
            value={filtered.some((g) => g.id === guardianId) ? guardianId : filtered[0]!.id}
            onChange={(e) => setGuardianId(e.target.value)}
          >
            {filtered.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.name} ({guardian.familyReferenceCode})
              </option>
            ))}
          </Select>
        </FormField>
      )}
      {message && <Alert variant={status === "error" ? "error" : "success"}>{message}</Alert>}
      <Button type="submit" size="xs" variant="tertiary" disabled={status === "submitting"} className="self-start">
        {status === "submitting" ? t("submitting") : t("assignGuardian")}
      </Button>
    </form>
  );
}
