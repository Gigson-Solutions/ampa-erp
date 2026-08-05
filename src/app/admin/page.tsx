import { useTranslations } from "next-intl";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { listAmpasOverview } from "@/lib/platform-admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

// Ruta deliberadamente fuera del segmento `[ampa]` — no pertenece a ninguna AMPA
// concreta, es el panel transversal de plataforma (ver require-platform-admin.ts).
// Sin el shell de sidebar de junta: no hay una AMPA "activa" en este contexto.
export default async function AdminPage(): Promise<React.ReactElement> {
  await requirePlatformAdmin();
  const ampas = await listAmpasOverview();

  return <AdminPageContent ampas={ampas} />;
}

function AdminPageContent({ ampas }: { ampas: Awaited<ReturnType<typeof listAmpasOverview>> }): React.ReactElement {
  const t = useTranslations("admin");

  return (
    <main className="min-h-screen bg-page p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader title={t("title")} />

        {ampas.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-700">{t("empty")}</p>
          </Card>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("name")}</TH>
                <TH>{t("subdomain")}</TH>
                <TH>{t("academicYear")}</TH>
                <TH>{t("families")}</TH>
                <TH>{t("pendingCharges")}</TH>
              </TR>
            </THead>
            <TBody>
              {ampas.map((ampa) => (
                <TR key={ampa.id}>
                  <TD className="font-medium">{ampa.name}</TD>
                  <TD className="text-ink-700">{ampa.subdomain}</TD>
                  <TD>{ampa.activeAcademicYearLabel ?? "—"}</TD>
                  <TD>{ampa.familyCount}</TD>
                  <TD>
                    {ampa.pendingChargesCount > 0 ? (
                      <Badge variant="warning">
                        {ampa.pendingChargesCount} ({ampa.pendingChargesTotal}€)
                      </Badge>
                    ) : (
                      <span className="text-ink-400">0</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </main>
  );
}
