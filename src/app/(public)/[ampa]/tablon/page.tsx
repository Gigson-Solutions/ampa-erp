import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { listAnnouncements } from "@/lib/announcements";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

interface PageProps {
  params: Promise<{ ampa: string }>;
}

// Tablón público — cualquier familia puede leerlo sin sesión, igual que la propia
// web pública de la AMPA. Nada de esto es sensible (son comunicados ya publicados
// a propósito para toda la AMPA).
export default async function TablonPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  const announcements = await listAnnouncements(ampa.id);

  return <TablonContent announcements={announcements} />;
}

function TablonContent({
  announcements,
}: {
  announcements: Awaited<ReturnType<typeof listAnnouncements>>;
}): React.ReactElement {
  const t = useTranslations("tablon");

  return (
    <div>
      <PageHeader title={t("title")} />

      {announcements.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">{t("empty")}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {announcements.map((announcement) => (
            <li key={announcement.id}>
              <Card>
                <h2 className="font-semibold text-ink-900">{announcement.title}</h2>
                <p className="mt-1 text-sm text-ink-700">{announcement.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
