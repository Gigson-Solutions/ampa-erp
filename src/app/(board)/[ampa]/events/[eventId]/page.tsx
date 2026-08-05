import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listEventRegistrations } from "@/lib/board-directory";
import { CancelRegistrationButton } from "./CancelRegistrationButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

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

  return (
    <>
      <PageHeader title={t("registrationsTitle")} />

      {registrations.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">{t("noRegistrations")}</p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("family")}</TH>
              <TH>{t("attendeeCount")}</TH>
              <TH>{t("status")}</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {registrations.map((registration) => (
              <TR key={registration.id}>
                <TD className="font-medium">{registration.familyReferenceCode}</TD>
                <TD>{registration.attendeeCount}</TD>
                <TD>
                  <Badge variant={registration.status === "WAITLISTED" ? "warning" : "success"}>
                    {registration.status === "WAITLISTED" ? t("waitlisted") : t("registered")}
                  </Badge>
                </TD>
                <TD>
                  <CancelRegistrationButton registrationId={registration.id} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
