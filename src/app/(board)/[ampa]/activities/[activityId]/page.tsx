import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listActivityEnrollments } from "@/lib/board-directory";
import { CancelEnrollmentButton } from "./CancelEnrollmentButton";

interface PageProps {
  params: Promise<{ activityId: string }>;
}

export default async function ActivityEnrollmentsPage({ params }: PageProps): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  const { activityId } = await params;
  const enrollments = await listActivityEnrollments(ampaId, activityId);

  return <ActivityEnrollmentsContent enrollments={enrollments} />;
}

function ActivityEnrollmentsContent({
  enrollments,
}: {
  enrollments: Awaited<ReturnType<typeof listActivityEnrollments>>;
}): React.ReactElement {
  const t = useTranslations("board.activities");

  if (enrollments.length === 0) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">{t("enrollmentsTitle")}</h1>
        <p className="mt-4">{t("noEnrollments")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{t("enrollmentsTitle")}</h1>
      <p className="mt-2">
        <Link href="attendance">{t("takeAttendance")}</Link>
      </p>
      <table className="mt-6 w-full text-left">
        <thead>
          <tr>
            <th>{t("student")}</th>
            <th>{t("family")}</th>
            <th>{t("status")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enrollment) => (
            <tr key={enrollment.id}>
              <td>{enrollment.studentName}</td>
              <td>{enrollment.familyReferenceCode}</td>
              <td>{enrollment.status === "WAITLISTED" ? t("waitlisted") : t("enrolled")}</td>
              <td>
                <CancelEnrollmentButton enrollmentId={enrollment.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
