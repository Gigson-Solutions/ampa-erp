"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAmpaAction } from "../../actions";
import type { AmpaDetail } from "@/lib/platform-admin";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label, Select } from "@/components/ui/Input";

export function EditAmpaForm({ ampa }: { ampa: AmpaDetail }): React.ReactElement {
  const router = useRouter();

  const [name, setName] = useState(ampa.name);
  const [active, setActive] = useState(ampa.active);
  const [sepaCreditorId, setSepaCreditorId] = useState(ampa.sepaCreditorId ?? "");
  const [sepaCreditorName, setSepaCreditorName] = useState(ampa.sepaCreditorName ?? "");
  const [sepaIban, setSepaIban] = useState(ampa.sepaIban ?? "");
  const [activeAcademicYearId, setActiveAcademicYearId] = useState(
    ampa.academicYears.find((year) => year.isActive)?.id ?? "",
  );
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const result = await updateAmpaAction(ampa.id, {
      name,
      active,
      sepaCreditorId: sepaCreditorId || undefined,
      sepaCreditorName: sepaCreditorName || undefined,
      sepaIban: sepaIban || undefined,
      activeAcademicYearId: activeAcademicYearId || undefined,
    });

    if (result.ok) {
      setStatus("success");
      setMessage("Guardado.");
      router.refresh();
    } else {
      setStatus("error");
      setMessage(result.error ?? "No se pudo guardar.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField>
        <Label htmlFor="edit-ampa-name">Nombre</Label>
        <Input id="edit-ampa-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-ink-900">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
        AMPA activa
      </label>

      {ampa.academicYears.length > 0 && (
        <FormField>
          <Label htmlFor="active-year">Curso activo</Label>
          <Select
            id="active-year"
            value={activeAcademicYearId}
            onChange={(e) => setActiveAcademicYearId(e.target.value)}
          >
            {ampa.academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-medium text-ink-900">Datos SEPA (onboarding bancario)</p>
        <div className="flex flex-col gap-3">
          <FormField>
            <Label htmlFor="sepa-creditor-id">Creditor ID</Label>
            <Input
              id="sepa-creditor-id"
              value={sepaCreditorId}
              onChange={(e) => setSepaCreditorId(e.target.value)}
            />
          </FormField>
          <FormField>
            <Label htmlFor="sepa-creditor-name">Nombre del acreedor</Label>
            <Input
              id="sepa-creditor-name"
              value={sepaCreditorName}
              onChange={(e) => setSepaCreditorName(e.target.value)}
            />
          </FormField>
          <FormField>
            <Label htmlFor="sepa-iban">IBAN</Label>
            <Input id="sepa-iban" value={sepaIban} onChange={(e) => setSepaIban(e.target.value)} />
          </FormField>
        </div>
      </div>

      {message && <Alert variant={status === "error" ? "error" : "success"}>{message}</Alert>}
      <Button type="submit" disabled={status === "submitting"} size="md">
        {status === "submitting" ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
