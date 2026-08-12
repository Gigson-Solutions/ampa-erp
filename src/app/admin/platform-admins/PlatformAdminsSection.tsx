"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { invitePlatformAdminAction, removePlatformAdminAction } from "../actions";
import type { PlatformAdminSummary } from "@/lib/platform-admin";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label } from "@/components/ui/Input";

// Gestión de superadmins de plataforma (feedback de usuario, 2026-08-11):
// hasta ahora solo se podía dar/quitar `User.isPlatformAdmin` a mano en la
// base de datos.
export function PlatformAdminsSection({ admins }: { admins: PlatformAdminSummary[] }): React.ReactElement {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const result = await invitePlatformAdminAction({ name, email });
    if (result.ok) {
      setName("");
      setEmail("");
      setStatus("idle");
      router.refresh();
    } else {
      setStatus("error");
      setError(result.error ?? "No se pudo invitar.");
    }
  }

  async function handleRemove(userId: string): Promise<void> {
    if (!window.confirm("¿Quitar el rol de superadmin de plataforma a esta persona?")) return;
    await removePlatformAdminAction(userId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {admins.length === 0 ? (
        <p className="text-sm text-ink-700">Todavía no hay superadmins de plataforma.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {admins.map((admin) => (
            <li key={admin.userId} className="flex items-center justify-between text-sm">
              <span className="text-ink-900">
                {admin.name ?? admin.email} <span className="text-ink-400">({admin.email})</span>
              </span>
              <Button type="button" variant="tertiary" size="xs" onClick={() => void handleRemove(admin.userId)}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleInvite} className="flex flex-col gap-3 border-t border-border pt-4">
        <FormField>
          <Label htmlFor="platform-admin-name">Nombre</Label>
          <Input id="platform-admin-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField>
          <Label htmlFor="platform-admin-email">Email</Label>
          <Input
            id="platform-admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        {status === "error" && error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" variant="secondary" size="sm" disabled={status === "submitting"} className="self-start">
          {status === "submitting" ? "Invitando…" : "Invitar superadmin"}
        </Button>
      </form>
    </div>
  );
}
