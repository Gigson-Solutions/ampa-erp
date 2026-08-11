"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateActivityAction, deleteActivityAction } from "./actions";
import type { ActivitySummary } from "@/lib/board-directory";
import type { MonitorSummary } from "@/lib/monitors";
import { formatCurrency } from "@/lib/format";
import { TR, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FormField, Input, Label, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface ActivityRowProps {
  activity: ActivitySummary;
  monitors: MonitorSummary[];
}

// CRUD de actividad (feedback de usuario, 2026-08-11): antes solo se podía
// crear, no editar ni borrar. Edición inline en la propia fila en vez de un
// modal — evita otra capa de UI nueva para algo que solo tiene 6 campos.
export function ActivityRow({ activity, monitors }: ActivityRowProps): React.ReactElement {
  const t = useTranslations("board.activities");
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(activity.name);
  const [capacity, setCapacity] = useState(activity.capacity?.toString() ?? "");
  const [price, setPrice] = useState(activity.price);
  const [monitorUserId, setMonitorUserId] = useState(activity.monitorUserId ?? "");
  const [installmentCount, setInstallmentCount] = useState(activity.installmentCount?.toString() ?? "");
  const [installmentRecurrenceDays, setInstallmentRecurrenceDays] = useState(
    activity.installmentRecurrenceDays?.toString() ?? "",
  );
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setStatus("submitting");
    setError(null);

    const result = await updateActivityAction(activity.id, {
      name,
      price,
      capacity: capacity ? Number(capacity) : undefined,
      monitorUserId: monitorUserId || undefined,
      installmentCount: installmentCount ? Number(installmentCount) : undefined,
      installmentRecurrenceDays: installmentRecurrenceDays ? Number(installmentRecurrenceDays) : undefined,
    });

    if (result.ok) {
      setEditing(false);
      setStatus("idle");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm(t("deleteConfirm"))) return;
    setStatus("submitting");
    setError(null);

    const result = await deleteActivityAction(activity.id);
    if (result.ok) {
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  if (editing) {
    return (
      <TR>
        <TD colSpan={6}>
          <div className="flex flex-col gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField>
                <Label htmlFor={`edit-name-${activity.id}`}>{t("name")}</Label>
                <Input id={`edit-name-${activity.id}`} value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField>
                <Label htmlFor={`edit-capacity-${activity.id}`}>{t("capacity")}</Label>
                <Input
                  id={`edit-capacity-${activity.id}`}
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder={t("capacityPlaceholder")}
                />
              </FormField>
              <FormField>
                <Label htmlFor={`edit-price-${activity.id}`}>{t("price")}</Label>
                <Input
                  id={`edit-price-${activity.id}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </FormField>
              <FormField>
                <Label htmlFor={`edit-monitor-${activity.id}`}>{t("monitor")}</Label>
                <Select
                  id={`edit-monitor-${activity.id}`}
                  value={monitorUserId}
                  onChange={(e) => setMonitorUserId(e.target.value)}
                >
                  <option value="">{t("noMonitor")}</option>
                  {monitors.map((monitor) => (
                    <option key={monitor.userId} value={monitor.userId}>
                      {monitor.name ?? monitor.email}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField>
                <Label htmlFor={`edit-installments-${activity.id}`}>{t("installmentCount")}</Label>
                <Input
                  id={`edit-installments-${activity.id}`}
                  type="number"
                  min={1}
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  placeholder="1"
                />
              </FormField>
              <FormField>
                <Label htmlFor={`edit-recurrence-${activity.id}`}>{t("installmentRecurrenceDays")}</Label>
                <Input
                  id={`edit-recurrence-${activity.id}`}
                  type="number"
                  min={1}
                  value={installmentRecurrenceDays}
                  onChange={(e) => setInstallmentRecurrenceDays(e.target.value)}
                  placeholder="30"
                />
              </FormField>
            </div>
            {status === "error" && error && <Alert variant="error">{error}</Alert>}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => void handleSave()} disabled={status === "submitting"}>
                {status === "submitting" ? t("submitting") : t("save")}
              </Button>
              <Button type="button" variant="tertiary" size="sm" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        </TD>
      </TR>
    );
  }

  return (
    <TR>
      <TD className="font-medium">
        {activity.name}
        {activity.installmentCount && activity.installmentCount > 1 && (
          <div className="text-xs text-ink-400">
            {activity.installmentCount} {t("installmentsBadge")}
          </div>
        )}
      </TD>
      <TD>{activity.academicYearLabel}</TD>
      <TD>{formatCurrency(activity.price)}</TD>
      <TD>{activity.monitorName ?? "—"}</TD>
      <TD>
        <div className="flex items-center gap-2">
          <span>
            {activity.enrolledCount}
            {activity.capacity !== null ? `/${activity.capacity}` : ""}
          </span>
          {activity.waitlistedCount > 0 && (
            <Badge variant="warning">
              +{activity.waitlistedCount} {t("waitlistShort")}
            </Badge>
          )}
        </div>
      </TD>
      <TD>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`activities/${activity.id}`} className="text-brand-500 hover:underline">
            {t("viewEnrollments")}
          </Link>
          <Button type="button" variant="tertiary" size="xs" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
          <Button type="button" variant="tertiary" size="xs" onClick={() => void handleDelete()}>
            {t("delete")}
          </Button>
        </div>
        {status === "error" && error && <p className="mt-1 text-xs text-danger-fg">{error}</p>}
      </TD>
    </TR>
  );
}
