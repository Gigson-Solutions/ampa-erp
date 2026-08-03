import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { prisma } from "@/lib/prisma";
import { listAnnouncements } from "@/lib/announcements";

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

  if (announcements.length === 0) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-4">{t("empty")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <ul className="mt-6 flex flex-col gap-6">
        {announcements.map((announcement) => (
          <li key={announcement.id}>
            <h2 className="font-semibold">{announcement.title}</h2>
            <p>{announcement.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
