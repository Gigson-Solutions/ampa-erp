import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listAnnouncements } from "@/lib/announcements";
import { AnnouncementForm } from "./AnnouncementForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function AnnouncementsPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_COMMUNICATIONS");
  const announcements = await listAnnouncements(ampaId);

  return <AnnouncementsPageContent announcements={announcements} />;
}

function AnnouncementsPageContent({
  announcements,
}: {
  announcements: Awaited<ReturnType<typeof listAnnouncements>>;
}): React.ReactElement {
  const t = useTranslations("board.announcements");

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("title")} />
      <Card>
        <AnnouncementForm />
      </Card>
      <ul className="mt-6 flex flex-col gap-4">
        {announcements.map((announcement) => (
          <li key={announcement.id}>
            <Card>
              <h2 className="font-semibold text-ink-900">{announcement.title}</h2>
              <p className="mt-1 text-sm text-ink-700">{announcement.body}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
