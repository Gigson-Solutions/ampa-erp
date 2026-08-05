import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
export default async function BoardLayout({ children, params }: BoardLayoutProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  return (
    <div className="min-h-screen bg-page">
      <Sidebar ampaSubdomain={subdomain} ampaName={ampa.name} />
      <div className="pl-64">
        <Topbar />
        <main className="mx-auto max-w-5xl p-8">{children}</main>
      </div>
    </div>
  );
}
