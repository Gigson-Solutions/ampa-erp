"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inviteMonitorAction, removeMonitorAction } from "./actions";
import type { MonitorSummary } from "@/lib/monitors";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

// Sistema de monitores (feedback de usuario, 2026-08-11): un listado de
// monitores dentro de /activities para poder asignarlos a una actividad
// concreta. "Invitar" solo da el rol MONITOR (mismo mecanismo de acceso que
// el resto de la app, login por magic link, sin contraseña) — no manda
// ningún email todavía (a diferencia del portal de familias, aquí no hace
// falta: el monitor puede pedir su magic link normalmente en /login en
// cuanto sepa que tiene acceso).
export function MonitorsSection({ monitors }: { monitors: MonitorSummary[] }): React.ReactElement {
  const t = useTranslations("board.activities");
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await inviteMonitorAction({ name, email });
    if (result.ok) {
      setName("");
      setEmail("");
      setStatus("idle");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? t("genericError"));
    }
  }

  async function handleRemove(userId: string): Promise<void> {
    if (!window.confirm(t("removeMonitorConfirm"))) return;
    await removeMonitorAction(userId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {monitors.length === 0 ? (
        <p className="text-sm text-ink-700">{t("noMonitors")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {monitors.map((monitor) => (
            <li key={monitor.userId} className="flex items-center justify-between text-sm">
              <span className="text-ink-900">
                {monitor.name ?? monitor.email} <span className="text-ink-400">({monitor.email})</span>
              </span>
              <Button type="button" variant="tertiary" size="xs" onClick={() => void handleRemove(monitor.userId)}>
                {t("removeMonitor")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleInvite} className="flex flex-col gap-3 border-t border-border pt-4">
        <FormField>
          <Label htmlFor="monitor-name">{t("monitorName")}</Label>
          <Input id="monitor-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField>
          <Label htmlFor="monitor-email">{t("monitorEmail")}</Label>
          <Input
            id="monitor-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        {status === "error" && error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" variant="secondary" size="sm" disabled={status === "submitting"} className="self-start">
          {status === "submitting" ? t("submitting") : t("inviteMonitor")}
        </Button>
      </form>
    </div>
  );
}
