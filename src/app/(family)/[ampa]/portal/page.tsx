import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { getMyFamilyOverview } from "@/lib/family-portal";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

interface PageProps {
  params: Promise<{ ampa: string }>;
}

// Portal de familias (Feedback #5, 2026-08-11): cada tutor/a ve SOLO su
// propia familia — hijos/as, estado de cuotas, actividades/eventos. Alcance
// v1: solo lectura (ver, no gestionar), coherente con el verbo que usa el
// feedback original ("ver hijos, estados de pago, actividades").
export default async function FamilyPortalPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampaId, userId } = await requireAmpaRole("VIEW_OWN_FAMILY");
  const { ampa: ampaSubdomain } = await params;

  const overview = await getMyFamilyOverview(ampaId, userId);

  return <FamilyPortalContent overview={overview} ampaSubdomain={ampaSubdomain} />;
}

function FamilyPortalContent({
  overview,
  ampaSubdomain,
}: {
  overview: Awaited<ReturnType<typeof getMyFamilyOverview>>;
  ampaSubdomain: string;
}): React.ReactElement {
  const t = useTranslations("portal");

  if (!overview) {
    return <Alert variant="error">{t("noFamilyFound")}</Alert>;
  }

  const chargeStatusVariant: Record<string, "success" | "warning" | "danger"> = {
    PAID: "success",
    PENDING: "warning",
    OVERDUE: "danger",
    CANCELLED: "warning",
  };

  return (
    <>
      <PageHeader title={`${t("title")} — ${overview.referenceCode}`} />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("childrenTitle")}</h2>
          {overview.children.length === 0 ? (
            <p className="text-sm text-ink-700">{t("noChildren")}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {overview.children.map((child) => (
                <li key={child.id} className="text-ink-900">
                  {child.name}
                  {child.birthDate && (
                    <span className="text-ink-400"> — {new Date(child.birthDate).toLocaleDateString("es-ES")}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("cardTitle")}</h2>
          {overview.cardToken ? (
            <Link
              href={`/${ampaSubdomain}/carnet/${overview.cardToken}`}
              className="text-sm text-brand-500 hover:underline"
            >
              {t("viewCard")}
            </Link>
          ) : (
            <p className="text-sm text-ink-700">{t("noCard")}</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("chargesTitle")}</h2>
          {overview.charges.length === 0 ? (
            <p className="text-sm text-ink-700">{t("noCharges")}</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>{t("concept")}</TH>
                  <TH>{t("amount")}</TH>
                  <TH>{t("dueDate")}</TH>
                  <TH>{t("status")}</TH>
                </TR>
              </THead>
              <TBody>
                {overview.charges.map((charge) => (
                  <TR key={charge.id}>
                    <TD>{charge.concept}</TD>
                    <TD>{formatCurrency(charge.amount)}</TD>
                    <TD>{new Date(charge.dueDate).toLocaleDateString("es-ES")}</TD>
                    <TD>
                      <Badge variant={chargeStatusVariant[charge.status] ?? "warning"}>
                        {t(`chargeStatus.${charge.status}` as "chargeStatus.PENDING")}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("activitiesTitle")}</h2>
          {overview.activities.length === 0 ? (
            <p className="text-sm text-ink-700">{t("noActivities")}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {overview.activities.map((activity, index) => (
                <li key={`${activity.activityId}-${index}`} className="flex items-center justify-between">
                  <span className="text-ink-900">
                    {activity.activityName} — {activity.studentName}
                  </span>
                  <Badge variant={activity.status === "WAITLISTED" ? "warning" : "success"}>
                    {activity.status === "WAITLISTED" ? t("waitlisted") : t("enrolled")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("eventsTitle")}</h2>
          {overview.events.length === 0 ? (
            <p className="text-sm text-ink-700">{t("noEvents")}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {overview.events.map((event) => (
                <li key={event.eventId} className="flex items-center justify-between">
                  <span className="text-ink-900">
                    {event.eventName} — {new Date(event.eventDate).toLocaleDateString("es-ES")}
                  </span>
                  <Badge variant={event.status === "WAITLISTED" ? "warning" : "success"}>
                    {event.status === "WAITLISTED" ? t("waitlisted") : t("registered")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
