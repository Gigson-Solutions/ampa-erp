import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listAcademicYears, listActivities, listStudents } from "@/lib/board-directory";
import { CreateActivityForm } from "./CreateActivityForm";
import { EnrollStudentForm } from "./EnrollStudentForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default async function ActivitiesPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");

  const [activities, academicYears, students] = await Promise.all([
    listActivities(ampaId),
    listAcademicYears(ampaId),
    listStudents(ampaId),
  ]);

  return <ActivitiesPageContent activities={activities} academicYears={academicYears} students={students} />;
}

function ActivitiesPageContent({
  activities,
  academicYears,
  students,
}: {
  activities: Awaited<ReturnType<typeof listActivities>>;
  academicYears: Awaited<ReturnType<typeof listAcademicYears>>;
  students: Awaited<ReturnType<typeof listStudents>>;
}): React.ReactElement {
  const t = useTranslations("board.activities");

  return (
    <>
      <PageHeader title={t("title")} />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("createActivity")}</h2>
          <CreateActivityForm academicYears={academicYears} />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("enroll")}</h2>
          <EnrollStudentForm activities={activities} students={students} />
        </Card>
      </div>

      <div className="mt-6">
        <Table>
          <THead>
            <TR>
              <TH>{t("name")}</TH>
              <TH>{t("academicYear")}</TH>
              <TH>{t("provider")}</TH>
              <TH>{t("occupancy")}</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {activities.map((activity) => (
              <TR key={activity.id}>
                <TD className="font-medium">{activity.name}</TD>
                <TD>{activity.academicYearLabel}</TD>
                <TD>{activity.providerName ?? "—"}</TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <span>
                      {activity.enrolledCount}
                      {activity.capacity !== null ? `/${activity.capacity}` : ""}
                    </span>
                    {activity.waitlistedCount > 0 && (
                      <Badge variant="warning">
                        +{activity.waitlistedCount} {t("waitlistShort")}
                      </Badge>
                    )}
                  </div>
                </TD>
                <TD>
                  <Link href={`activities/${activity.id}`} className="text-brand-500 hover:underline">
                    {t("viewEnrollments")}
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
