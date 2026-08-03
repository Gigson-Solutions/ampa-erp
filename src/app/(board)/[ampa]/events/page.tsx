import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listEvents, listFamilies } from "@/lib/board-directory";
import { CreateEventForm } from "./CreateEventForm";
import { RegisterFamilyForm } from "./RegisterFamilyForm";

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
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="mt-6">
        <h2 className="font-semibold">{t("createEvent")}</h2>
        <CreateEventForm />
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">{t("register")}</h2>
        <RegisterFamilyForm events={events} families={families} />
      </section>

      <section className="mt-8">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("date")}</th>
              <th>{t("price")}</th>
              <th>{t("attendance")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.name}</td>
                <td>{new Date(event.date).toLocaleDateString("es-ES")}</td>
                <td>{event.price !== null ? `${event.price}€` : "—"}</td>
                <td>
                  {event.registeredAttendees}
                  {event.capacity !== null ? `/${event.capacity}` : ""}
                  {event.waitlistedCount > 0 ? ` (+${event.waitlistedCount} ${t("waitlistShort")})` : ""}
                </td>
                <td>
                  <Link href={`events/${event.id}`}>{t("viewRegistrations")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
