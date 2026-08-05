"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function Topbar(): React.ReactElement {
  return (
    <header className="sticky top-0 z-10 flex h-[78px] items-center justify-end border-b border-border bg-surface px-8">
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-page"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </header>
  );
}
