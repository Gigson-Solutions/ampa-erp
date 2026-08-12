"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  UserCheck,
  CreditCard,
  Receipt,
  ClipboardList,
  CalendarDays,
  Megaphone,
  FileText,
  BookText,
  Download,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";
import type { Permission } from "@/lib/authz";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  // Feedback de usuario (2026-08-11): antes se pintaban las 9 secciones sin
  // mirar los permisos reales del usuario — un monitor (solo rol MONITOR)
  // veía enlaces que le daban 404 al pulsarlos. Cada item declara qué permiso
  // necesita; el layout resuelve los permisos reales y los pasa aquí.
  requiredPermission: Permission;
}

interface SidebarProps {
  ampaSubdomain: string;
  ampaName: string;
  permissions: Permission[];
}

// Estructura extraída del componente "Nav bar" del design kit: logo arriba,
// sección "main menu" con items en pastilla redondeada (r=8, fondo de
// hover/activo #ebeef0 -> --color-nav-hover), 264px de ancho fijo.
export function Sidebar({ ampaSubdomain, ampaName, permissions }: SidebarProps): React.ReactElement {
  const pathname = usePathname();

  const base = `/${ampaSubdomain}`;
  const items: NavItem[] = [
    { href: `${base}/families`, label: "Familias", icon: Users, requiredPermission: "MANAGE_MEMBERS" },
    { href: `${base}/members`, label: "Socios", icon: UserCheck, requiredPermission: "MANAGE_MEMBERS" },
    { href: `${base}/memberships`, label: "Membresías", icon: CreditCard, requiredPermission: "MANAGE_MEMBERS" },
    { href: `${base}/charges`, label: "Cargos", icon: Receipt, requiredPermission: "MANAGE_TREASURY" },
    {
      href: `${base}/activities`,
      label: "Extraescolares",
      icon: ClipboardList,
      requiredPermission: "MANAGE_ACTIVITIES",
    },
    { href: `${base}/events`, label: "Eventos", icon: CalendarDays, requiredPermission: "MANAGE_ACTIVITIES" },
    { href: `${base}/shifts`, label: "Turnos", icon: Clock, requiredPermission: "MANAGE_ACTIVITIES" },
    {
      href: `${base}/my-activities`,
      label: "Mi actividad",
      icon: ClipboardList,
      requiredPermission: "VIEW_OWN_ACTIVITIES",
    },
    {
      href: `${base}/announcements`,
      label: "Comunicados",
      icon: Megaphone,
      requiredPermission: "MANAGE_COMMUNICATIONS",
    },
    {
      href: `${base}/documents`,
      label: "Documentos",
      icon: FileText,
      requiredPermission: "MANAGE_COMMUNICATIONS",
    },
    { href: `${base}/minutes`, label: "Libro de actas", icon: BookText, requiredPermission: "MANAGE_MEMBERS" },
    {
      href: `${base}/export`,
      label: "Exportar datos",
      icon: Download,
      requiredPermission: "MANAGE_AMPA_SETTINGS",
    },
  ];

  const visibleItems = items.filter((item) => permissions.includes(item.requiredPermission));

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
          {visibleItems.map((item) => {
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
