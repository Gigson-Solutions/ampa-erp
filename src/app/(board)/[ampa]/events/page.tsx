import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listEvents, listFamilies } from "@/lib/board-directory";
import { CreateEventForm } from "./CreateEventForm";
import { RegisterFamilyForm } from "./RegisterFamilyForm";
import { EventsCalendar } from "./EventsCalendar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

interface PageProps {
  params: Promise<{ ampa: string }>;
}

export default async function EventsPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  const { ampa: ampaSubdomain } = await params;

  const [events, families] = await Promise.all([listEvents(ampaId), listFamilies(ampaId)]);

  return <EventsPageContent events={events} families={families} ampaSubdomain={ampaSubdomain} />;
}

function EventsPageContent({
  events,
  families,
  ampaSubdomain,
}: {
  events: Awaited<ReturnType<typeof listEvents>>;
  families: Awaited<ReturnType<typeof listFamilies>>;
  ampaSubdomain: string;
}): React.ReactElement {
  const t = useTranslations("board.events");

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <a
            href={`/${ampaSubdomain}/events/calendar.ics`}
            className="text-sm text-brand-500 hover:underline"
          >
            {t("subscribeCalendar")}
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("createEvent")}</h2>
          <CreateEventForm />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("register")}</h2>
          <RegisterFamilyForm events={events} families={families} />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <EventsCalendar events={events} />
        </Card>
      </div>
    </>
  );
}
