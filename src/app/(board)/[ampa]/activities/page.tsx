import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listAcademicYears, listActivities, listStudents } from "@/lib/board-directory";
import { CreateActivityForm } from "./CreateActivityForm";
import { EnrollStudentForm } from "./EnrollStudentForm";

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
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="mt-6">
        <h2 className="font-semibold">{t("createActivity")}</h2>
        <CreateActivityForm academicYears={academicYears} />
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">{t("enroll")}</h2>
        <EnrollStudentForm activities={activities} students={students} />
      </section>

      <section className="mt-8">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("academicYear")}</th>
              <th>{t("provider")}</th>
              <th>{t("occupancy")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity.id}>
                <td>{activity.name}</td>
                <td>{activity.academicYearLabel}</td>
                <td>{activity.providerName ?? "—"}</td>
                <td>
                  {activity.enrolledCount}
                  {activity.capacity !== null ? `/${activity.capacity}` : ""}
                  {activity.waitlistedCount > 0 ? ` (+${activity.waitlistedCount} ${t("waitlistShort")})` : ""}
                </td>
                <td>
                  <Link href={`activities/${activity.id}`}>{t("viewEnrollments")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
