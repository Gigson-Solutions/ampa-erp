"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAmpaAction } from "../../actions";
import type { CenterOption } from "@/lib/platform-admin";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label, Select } from "@/components/ui/Input";

// Alta de AMPA (feedback de usuario, 2026-08-11): hasta ahora solo se podía
// hacer editando prisma/seed.ts a mano o con Prisma Studio.
export function CreateAmpaForm({ centers }: { centers: CenterOption[] }): React.ReactElement {
  const router = useRouter();

  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [locale, setLocale] = useState<"es" | "ca" | "eu" | "gl" | "va">("es");
  const [useExistingCenter, setUseExistingCenter] = useState(centers.length > 0);
  const [centerId, setCenterId] = useState(centers[0]?.id ?? "");
  const [newCenterName, setNewCenterName] = useState("");
  const [newCenterCode, setNewCenterCode] = useState("");
  const [academicYearLabel, setAcademicYearLabel] = useState("2026-2027");
  const [academicYearStart, setAcademicYearStart] = useState("2026-09-01");
  const [academicYearEnd, setAcademicYearEnd] = useState("2027-06-30");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createAmpaAction({
      name,
      subdomain,
      locale,
      centerId: useExistingCenter ? centerId : undefined,
      newCenterName: useExistingCenter ? undefined : newCenterName,
      newCenterCode: useExistingCenter ? undefined : newCenterCode,
      academicYearLabel,
      academicYearStart: new Date(academicYearStart),
      academicYearEnd: new Date(academicYearEnd),
    });

    if (result.ok && result.id) {
      router.push(`/admin/ampas/${result.id}`);
    } else {
      setStatus("error");
      setError(result.error ?? "No se pudo crear la AMPA.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField>
        <Label htmlFor="ampa-name">Nombre de la AMPA</Label>
        <Input id="ampa-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="ampa-subdomain">Subdominio</Label>
        <Input
          id="ampa-subdomain"
          required
          value={subdomain}
          onChange={(e) => setSubdomain(e.target.value)}
          placeholder="p. ej. campanar"
        />
      </FormField>
      <FormField>
        <Label htmlFor="ampa-locale">Idioma</Label>
        <Select id="ampa-locale" value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)}>
          <option value="es">Español</option>
          <option value="ca">Català</option>
          <option value="eu">Euskara</option>
          <option value="gl">Galego</option>
          <option value="va">Valencià</option>
        </Select>
      </FormField>

      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-medium text-ink-900">Centro educativo</p>
        {centers.length > 0 && (
          <label className="mb-3 flex items-center gap-2 text-sm text-ink-900">
            <input
              type="radio"
              checked={useExistingCenter}
              onChange={() => setUseExistingCenter(true)}
              className="h-4 w-4"
            />
            Centro existente
          </label>
        )}
        {useExistingCenter && centers.length > 0 ? (
          <Select value={centerId} onChange={(e) => setCenterId(e.target.value)}>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </Select>
        ) : null}
        <label className="mt-3 mb-3 flex items-center gap-2 text-sm text-ink-900">
          <input
            type="radio"
            checked={!useExistingCenter}
            onChange={() => setUseExistingCenter(false)}
            className="h-4 w-4"
          />
          Centro nuevo
        </label>
        {!useExistingCenter && (
          <div className="grid grid-cols-2 gap-3">
            <FormField>
              <Label htmlFor="new-center-name">Nombre del centro</Label>
              <Input
                id="new-center-name"
                value={newCenterName}
                onChange={(e) => setNewCenterName(e.target.value)}
              />
            </FormField>
            <FormField>
              <Label htmlFor="new-center-code">Código del centro</Label>
              <Input
                id="new-center-code"
                value={newCenterCode}
                onChange={(e) => setNewCenterCode(e.target.value)}
              />
            </FormField>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-medium text-ink-900">Curso académico inicial</p>
        <FormField>
          <Label htmlFor="year-label">Curso</Label>
          <Input
            id="year-label"
            required
            value={academicYearLabel}
            onChange={(e) => setAcademicYearLabel(e.target.value)}
          />
        </FormField>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FormField>
            <Label htmlFor="year-start">Inicio</Label>
            <Input
              id="year-start"
              type="date"
              required
              value={academicYearStart}
              onChange={(e) => setAcademicYearStart(e.target.value)}
            />
          </FormField>
          <FormField>
            <Label htmlFor="year-end">Fin</Label>
            <Input
              id="year-end"
              type="date"
              required
              value={academicYearEnd}
              onChange={(e) => setAcademicYearEnd(e.target.value)}
            />
          </FormField>
        </div>
      </div>

      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={status === "submitting"} size="md">
        {status === "submitting" ? "Creando…" : "Crear AMPA"}
      </Button>
    </form>
  );
}
