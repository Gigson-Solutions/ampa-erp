import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listEvents, listFamilies } from "@/lib/board-directory";
import { CreateEventForm } from "./CreateEventForm";
import { RegisterFamilyForm } from "./RegisterFamilyForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default async function EventsPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");

  const [events, families] = await Promise.all([listEvents(ampaId), listFamilies(ampaId)]);

  return <EventsPageContent events={events} families={families} />;
}

function EventsPageContent({
  events,
  families,
}: {
  events: Awaited<ReturnType<typeof listEvents>>;
  families: Awaited<ReturnType<typeof listFamilies>>;
}): React.ReactElement {
  const t = useTranslations("board.events");

  return (
    <>
      <PageHeader title={t("title")} />

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
        <Table>
          <THead>
            <TR>
              <TH>{t("name")}</TH>
              <TH>{t("date")}</TH>
              <TH>{t("price")}</TH>
              <TH>{t("attendance")}</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {events.map((event) => (
              <TR key={event.id}>
                <TD className="font-medium">{event.name}</TD>
                <TD>{new Date(event.date).toLocaleDateString("es-ES")}</TD>
                <TD>{event.price !== null ? `${event.price}€` : "—"}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <span>
                      {event.registeredAttendees}
                      {event.capacity !== null ? `/${event.capacity}` : ""}
                    </span>
                    {event.waitlistedCount > 0 && (
                      <Badge variant="warning">
                        +{event.waitlistedCount} {t("waitlistShort")}
                      </Badge>
                    )}
                  </div>
                </TD>
                <TD>
                  <Link href={`events/${event.id}`} className="text-brand-500 hover:underline">
                    {t("viewRegistrations")}
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
