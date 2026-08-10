"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

// Atajo de desarrollo: entra de un clic como uno de los usuarios del seed, sin tener
// que ir a buscar el magic link al log en cada prueba. Solo se renderiza si el
// servidor pasa `enabled` (ver page.tsx) y solo funciona si el proveedor
// "dev-quick-login" está registrado, que no ocurre en producción (ver auth.config.ts).
//
// Los textos están en castellano a pelo, sin next-intl, a propósito: es una
// herramienta interna que nunca llega a una familia, y traducirla a los 5 idiomas
// solo añadiría claves que mantener.
const DEV_USERS = [
  { email: "presidencia@example.com", label: "Presidencia", hint: "junta de IES Campanar" },
  { email: "tesoreria@example.com", label: "Tesorería", hint: "cobros y cargos" },
  { email: "admin@example.com", label: "Admin de plataforma", hint: "panel /admin" },
] as const;

export function DevQuickLogin({ callbackUrl }: { callbackUrl?: string }): React.ReactElement {
  const [failed, setFailed] = useState(false);

  async function enter(email: string): Promise<void> {
    setFailed(false);
    const result = await signIn("dev-quick-login", {
      email,
      redirect: false,
      callbackUrl: callbackUrl ?? "/campanar/families",
    });
    if (result?.error) {
      setFailed(true);
      return;
    }
    // Navegación completa (no router.push) para que el Server Component del panel se
    // re-renderice ya con la cookie de sesión recién puesta.
    window.location.assign(result?.url ?? callbackUrl ?? "/campanar/families");
  }

  return (
    <div className="mt-6 border-t border-border pt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-700">Solo desarrollo</p>
      <p className="mt-1 text-sm text-ink-700">Entrar sin magic link como:</p>
      <div className="mt-3 flex flex-col gap-2">
        {DEV_USERS.map((user) => (
          <Button
            key={user.email}
            type="button"
            variant="secondary"
            size="md"
            onClick={() => void enter(user.email)}
          >
            {user.label} — {user.hint}
          </Button>
        ))}
      </div>
      {failed && (
        <Alert variant="error">
          No se pudo entrar. ¿Está la base de datos sembrada (`pnpm exec prisma db seed`)?
        </Alert>
      )}
    </div>
  );
}
