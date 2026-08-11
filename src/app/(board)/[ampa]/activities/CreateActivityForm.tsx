"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createActivityAction } from "./actions";
import type { AcademicYearSummary } from "@/lib/board-directory";
import type { MonitorSummary } from "@/lib/monitors";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label, Select } from "@/components/ui/Input";

interface CreateActivityFormProps {
  academicYears: AcademicYearSummary[];
  monitors: MonitorSummary[];
}

export function CreateActivityForm({ academicYears, monitors }: CreateActivityFormProps): React.ReactElement {
  const t = useTranslations("board.activities");
  const router = useRouter();

  const [name, setName] = useState("");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id ?? "");
  const [capacity, setCapacity] = useState<string>("");
  const [price, setPrice] = useState(0);
  const [monitorUserId, setMonitorUserId] = useState<string>("");
  const [installmentCount, setInstallmentCount] = useState<string>("");
  const [installmentRecurrenceDays, setInstallmentRecurrenceDays] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await createActivityAction({
      name,
      academicYearId,
      price,
      capacity: capacity ? Number(capacity) : undefined,
      monitorUserId: monitorUserId || undefined,
      installmentCount: installmentCount ? Number(installmentCount) : undefined,
      installmentRecurrenceDays: installmentRecurrenceDays ? Number(installmentRecurrenceDays) : undefined,
    });

    if (result.ok) {
      setName("");
      setCapacity("");
      setPrice(0);
      setMonitorUserId("");
      setInstallmentCount("");
      setInstallmentRecurrenceDays("");
      setStatus("idle");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  if (academicYears.length === 0) {
    return <Alert variant="error">{t("noAcademicYears")}</Alert>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField>
        <Label htmlFor="activity-name">{t("name")}</Label>
        <Input id="activity-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField>
        <Label htmlFor="activity-year">{t("academicYear")}</Label>
        <Select id="activity-year" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField>
        <Label htmlFor="activity-capacity">{t("capacity")}</Label>
        <Input
          id="activity-capacity"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder={t("capacityPlaceholder")}
        />
      </FormField>
      <FormField>
        <Label htmlFor="activity-price">{t("price")}</Label>
        <Input
          id="activity-price"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </FormField>
      <FormField>
        <Label htmlFor="activity-monitor">{t("monitor")}</Label>
        <Select id="activity-monitor" value={monitorUserId} onChange={(e) => setMonitorUserId(e.target.value)}>
          <option value="">{t("noMonitor")}</option>
          {monitors.map((monitor) => (
            <option key={monitor.userId} value={monitor.userId}>
              {monitor.name ?? monitor.email}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-medium text-ink-900">{t("installmentsTitle")}</p>
        <p className="mb-3 text-xs text-ink-400">{t("installmentsHint")}</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField>
            <Label htmlFor="activity-installment-count">{t("installmentCount")}</Label>
            <Input
              id="activity-installment-count"
              type="number"
              min={1}
              value={installmentCount}
              onChange={(e) => setInstallmentCount(e.target.value)}
              placeholder="1"
            />
          </FormField>
          <FormField>
            <Label htmlFor="activity-installment-recurrence">{t("installmentRecurrenceDays")}</Label>
            <Input
              id="activity-installment-recurrence"
              type="number"
              min={1}
              value={installmentRecurrenceDays}
              onChange={(e) => setInstallmentRecurrenceDays(e.target.value)}
              placeholder="30"
            />
          </FormField>
        </div>
      </div>
      {status === "error" && error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" disabled={status === "submitting"} variant="secondary">
        {status === "submitting" ? t("submitting") : t("createActivity")}
      </Button>
    </form>
  );
}
