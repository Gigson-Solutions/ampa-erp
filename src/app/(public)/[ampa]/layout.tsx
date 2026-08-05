import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ ampa: string }>;
}

// Shell público compartido (alta, tablón, documentos, carnet, bienvenida) — sin
// sidebar de junta, solo una cabecera ligera con el nombre de la AMPA. No hay
// sesión aquí, así que no hay gate de autorización — cada página resuelve su
// propio contenido; este layout es puramente presentacional.
export default async function PublicLayout({ children, params }: PublicLayoutProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-sm font-bold text-white">
            {ampa.name.slice(0, 1).toUpperCase()}
          </div>
          <span className="font-semibold text-ink-900">{ampa.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">{children}</main>
    </div>
  );
}
