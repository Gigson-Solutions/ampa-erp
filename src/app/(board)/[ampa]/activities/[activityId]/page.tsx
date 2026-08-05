import Link from "next/link";
import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listActivityEnrollments } from "@/lib/board-directory";
import { CancelEnrollmentButton } from "./CancelEnrollmentButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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

  return (
    <>
      <PageHeader
        title={t("enrollmentsTitle")}
        actions={
          <Link href="attendance">
            <Button variant="secondary" size="sm">
              {t("takeAttendance")}
            </Button>
          </Link>
        }
      />

      {enrollments.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">{t("noEnrollments")}</p>
        </Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("student")}</TH>
              <TH>{t("family")}</TH>
              <TH>{t("status")}</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {enrollments.map((enrollment) => (
              <TR key={enrollment.id}>
                <TD className="font-medium">{enrollment.studentName}</TD>
                <TD>{enrollment.familyReferenceCode}</TD>
                <TD>
                  <Badge variant={enrollment.status === "WAITLISTED" ? "warning" : "success"}>
                    {enrollment.status === "WAITLISTED" ? t("waitlisted") : t("enrolled")}
                  </Badge>
                </TD>
                <TD>
                  <CancelEnrollmentButton enrollmentId={enrollment.id} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
