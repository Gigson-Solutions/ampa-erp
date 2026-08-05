"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  CreditCard,
  Receipt,
  ClipboardList,
  CalendarDays,
  Megaphone,
  FileText,
  BookText,
  Download,
} from "lucide-react";
import { clsx } from "clsx";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface SidebarProps {
  ampaSubdomain: string;
  ampaName: string;
}

// Estructura extraída del componente "Nav bar" del design kit: logo arriba,
// sección "main menu" con items en pastilla redondeada (r=8, fondo de
// hover/activo #ebeef0 -> --color-nav-hover), 264px de ancho fijo.
export function Sidebar({ ampaSubdomain, ampaName }: SidebarProps): React.ReactElement {
  const pathname = usePathname();

  const base = `/${ampaSubdomain}`;
  const items: NavItem[] = [
    { href: `${base}/families`, label: "Familias", icon: Users },
    { href: `${base}/memberships`, label: "Membresías", icon: CreditCard },
    { href: `${base}/charges`, label: "Cargos", icon: Receipt },
    { href: `${base}/activities`, label: "Extraescolares", icon: ClipboardList },
    { href: `${base}/events`, label: "Eventos", icon: CalendarDays },
    { href: `${base}/announcements`, label: "Comunicados", icon: Megaphone },
    { href: `${base}/documents`, label: "Documentos", icon: FileText },
    { href: `${base}/minutes`, label: "Libro de actas", icon: BookText },
    { href: `${base}/export`, label: "Exportar datos", icon: Download },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-white">
          {ampaName.slice(0, 1).toUpperCase()}
        </div>
        <span className="truncate text-sm font-semibold text-ink-900">{ampaName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <p className="px-3 py-2 text-xs font-semibold tracking-wide text-ink-400 uppercase">Menú principal</p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-nav-hover text-ink-900" : "text-ink-700 hover:bg-nav-hover",
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
