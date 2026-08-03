import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listAnnouncements } from "@/lib/announcements";
import { AnnouncementForm } from "./AnnouncementForm";

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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <div className="mt-6">
        <AnnouncementForm />
      </div>
      <ul className="mt-8 flex flex-col gap-4">
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
