import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUserRolesForAmpa, getPermissionsForRoles } from "@/lib/authz";
import { Sidebar } from "@/components/board/Sidebar";
import { Topbar } from "@/components/board/Topbar";

interface BoardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ ampa: string }>;
}

// Shell compartido de toda la zona de junta (sidebar + topbar) — antes cada
// página de (board) no tenía ninguna navegación entre sí. La autorización real
// (sesión + rol) la sigue haciendo cada página con `requireAmpaRole`; este layout
// solo resuelve el nombre de la AMPA para mostrarlo, es puramente presentacional.
//
// Feedback de usuario (2026-08-11): un usuario con permisos limitados (p.ej.
// un monitor, solo rol MONITOR) veía las 9 secciones completas del Sidebar
// aunque 404earan todas menos "Mi actividad" — aquí se resuelven los permisos
// reales (solo lectura, sin gate — el gate de verdad sigue en cada página) y
// se le pasan al Sidebar para que solo muestre lo accesible.
export default async function BoardLayout({ children, params }: BoardLayoutProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  const session = await auth();
  const roles = session?.user?.id ? await getUserRolesForAmpa(session.user.id, ampa.id) : [];
  const permissions = getPermissionsForRoles(roles);

  return (
    <div className="min-h-screen bg-page">
      <Sidebar ampaSubdomain={subdomain} ampaName={ampa.name} permissions={permissions} />
      <div className="pl-64">
        <Topbar />
        <main className="mx-auto max-w-5xl p-8">{children}</main>
      </div>
    </div>
  );
}
