import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Shell del panel de plataforma — antes cada página se envolvía su propio
// <main>, ahora que hay varias rutas (/admin, /admin/ampas/new,
// /admin/ampas/[ampaId], /admin/platform-admins) se comparte aquí. Nav
// mínima, sin la Sidebar de junta (esto no pertenece a ninguna AMPA).
export default function AdminLayout({ children }: AdminLayoutProps): React.ReactElement {
  return (
    <main className="min-h-screen bg-page p-8">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6 flex gap-4 border-b border-border pb-3 text-sm font-medium">
          <Link href="/admin" className="text-ink-700 hover:text-ink-900">
            AMPAs
          </Link>
          <Link href="/admin/platform-admins" className="text-ink-700 hover:text-ink-900">
            Superadmins
          </Link>
        </nav>
        {children}
      </div>
    </main>
  );
}
