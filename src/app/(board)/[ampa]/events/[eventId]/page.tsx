import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listEventRegistrations } from "@/lib/board-directory";
import { CancelRegistrationButton } from "./CancelRegistrationButton";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventRegistrationsPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  const { eventId } = await params;
  const registrations = await listEventRegistrations(ampaId, eventId);

  return <EventRegistrationsContent registrations={registrations} />;
}

function EventRegistrationsContent({
  registrations,
}: {
  registrations: Awaited<ReturnType<typeof listEventRegistrations>>;
}): React.ReactElement {
  const t = useTranslations("board.events");

  if (registrations.length === 0) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">{t("registrationsTitle")}</h1>
        <p className="mt-4">{t("noRegistrations")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{t("registrationsTitle")}</h1>
      <table className="mt-6 w-full text-left">
        <thead>
          <tr>
            <th>{t("family")}</th>
            <th>{t("attendeeCount")}</th>
            <th>{t("status")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {registrations.map((registration) => (
            <tr key={registration.id}>
              <td>{registration.familyReferenceCode}</td>
              <td>{registration.attendeeCount}</td>
              <td>{registration.status === "WAITLISTED" ? t("waitlisted") : t("registered")}</td>
              <td>
                <CancelRegistrationButton registrationId={registration.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
