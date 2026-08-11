import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/board/Topbar";

interface FamilyLayoutProps {
  children: React.ReactNode;
  params: Promise<{ ampa: string }>;
}

// Portal de familias (Feedback #5, 2026-08-11) — shell propio, deliberadamente
// SIN la Sidebar de 9 secciones del panel de junta (nada de eso le sirve a un
// tutor/a con el rol FAMILIA, y mostrar enlaces que dan 404 al pulsarlos es
// mala UX). Solo una cabecera con el nombre de la AMPA + cerrar sesión
// (reutiliza el mismo Topbar del panel de junta, que ya es genérico). La
// autorización real (sesión + rol FAMILIA) la hace cada página con
// `requireAmpaRole("VIEW_OWN_FAMILY")` — este layout es puramente
// presentacional, igual que el resto de layouts del proyecto.
export default async function FamilyLayout({ children, params }: FamilyLayoutProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  return (
    <div className="min-h-screen bg-page">
      <Topbar />
      <main className="mx-auto max-w-2xl px-6 py-10">{children}</main>
    </div>
  );
}
