import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listAcademicYears, listActivities, listStudents } from "@/lib/board-directory";
import { listMonitors } from "@/lib/monitors";
import { CreateActivityForm } from "./CreateActivityForm";
import { EnrollStudentForm } from "./EnrollStudentForm";
import { ActivityRow } from "./ActivityRow";
import { MonitorsSection } from "./MonitorsSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH } from "@/components/ui/Table";

export default async function ActivitiesPage(): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");

  const [activities, academicYears, students, monitors] = await Promise.all([
    listActivities(ampaId),
    listAcademicYears(ampaId),
    listStudents(ampaId),
    listMonitors(ampaId),
  ]);

  return (
    <ActivitiesPageContent
      activities={activities}
      academicYears={academicYears}
      students={students}
      monitors={monitors}
    />
  );
}

function ActivitiesPageContent({
  activities,
  academicYears,
  students,
  monitors,
}: {
  activities: Awaited<ReturnType<typeof listActivities>>;
  academicYears: Awaited<ReturnType<typeof listAcademicYears>>;
  students: Awaited<ReturnType<typeof listStudents>>;
  monitors: Awaited<ReturnType<typeof listMonitors>>;
}): React.ReactElement {
  const t = useTranslations("board.activities");

  return (
    <>
      <PageHeader title={t("title")} />

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("createActivity")}</h2>
          <CreateActivityForm academicYears={academicYears} monitors={monitors} />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("enroll")}</h2>
          <EnrollStudentForm activities={activities} students={students} />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="mb-4 font-semibold text-ink-900">{t("monitorsTitle")}</h2>
          <MonitorsSection monitors={monitors} />
        </Card>
      </div>

      <div className="mt-6">
        <Table>
          <THead>
            <TR>
              <TH>{t("name")}</TH>
              <TH>{t("academicYear")}</TH>
              <TH>{t("price")}</TH>
              <TH>{t("monitor")}</TH>
              <TH>{t("occupancy")}</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} monitors={monitors} />
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
