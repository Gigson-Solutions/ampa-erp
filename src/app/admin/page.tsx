import { useTranslations } from "next-intl";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { listAmpasOverview } from "@/lib/platform-admin";

// Ruta deliberadamente fuera del segmento `[ampa]` — no pertenece a ninguna AMPA
// concreta, es el panel transversal de plataforma (ver require-platform-admin.ts).
export default async function AdminPage(): Promise<React.ReactElement> {
  await requirePlatformAdmin();
  const ampas = await listAmpasOverview();

  return <AdminPageContent ampas={ampas} />;
}

function AdminPageContent({ ampas }: { ampas: Awaited<ReturnType<typeof listAmpasOverview>> }): React.ReactElement {
  const t = useTranslations("admin");

  if (ampas.length === 0) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-4">{t("empty")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <table className="mt-6 w-full text-left">
        <thead>
          <tr>
            <th>{t("name")}</th>
            <th>{t("subdomain")}</th>
            <th>{t("academicYear")}</th>
            <th>{t("families")}</th>
            <th>{t("pendingCharges")}</th>
          </tr>
        </thead>
        <tbody>
          {ampas.map((ampa) => (
            <tr key={ampa.id}>
              <td>{ampa.name}</td>
              <td>{ampa.subdomain}</td>
              <td>{ampa.activeAcademicYearLabel ?? "—"}</td>
              <td>{ampa.familyCount}</td>
              <td>
                {ampa.pendingChargesCount} ({ampa.pendingChargesTotal}€)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
