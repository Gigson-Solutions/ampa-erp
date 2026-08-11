import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listMyMonitoredActivities } from "@/lib/monitors";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

// Vista del monitor (feedback de usuario, 2026-08-11) — gate distinto de
// `MANAGE_ACTIVITIES`: un monitor solo tiene el rol `MONITOR`, no gestiona
// nada, solo VE los alumnos de SUS actividades. Alcance v1: solo lectura.
export default async function MyActivitiesPage(): Promise<React.ReactElement> {
  const { ampaId, userId } = await requireAmpaRole("VIEW_OWN_ACTIVITIES");
  const activities = await listMyMonitoredActivities(ampaId, userId);

  return <MyActivitiesContent activities={activities} />;
}

function MyActivitiesContent({
  activities,
}: {
  activities: Awaited<ReturnType<typeof listMyMonitoredActivities>>;
}): React.ReactElement {
  const t = useTranslations("board.myActivities");

  if (activities.length === 0) {
    return (
      <>
        <PageHeader title={t("title")} />
        <Card>
          <p className="text-sm text-ink-700">{t("noActivities")}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("title")} />
      {activities.map((activity) => (
        <div key={activity.activityId} className="mb-6">
          <Card>
            <h2 className="mb-4 font-semibold text-ink-900">{activity.activityName}</h2>
            {activity.students.length === 0 ? (
              <p className="text-sm text-ink-700">{t("noStudents")}</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>{t("student")}</TH>
                    <TH>{t("family")}</TH>
                    <TH>{t("status")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {activity.students.map((student, index) => (
                    <TR key={index}>
                      <TD>{student.studentName}</TD>
                      <TD>{student.familyReferenceCode}</TD>
                      <TD>
                        <Badge variant={student.status === "WAITLISTED" ? "warning" : "success"}>
                          {student.status === "WAITLISTED" ? t("waitlisted") : t("enrolled")}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      ))}
    </>
  );
}
