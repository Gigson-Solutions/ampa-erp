import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listAttendanceForDate } from "@/lib/attendance";
import { AttendanceRoster } from "./AttendanceRoster";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PageProps {
  params: Promise<{ activityId: string }>;
  searchParams: Promise<{ date?: string }>;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendancePage({ params, searchParams }: PageProps): Promise<React.ReactElement> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  const { activityId } = await params;
  const { date } = await searchParams;
  const selectedDate = date ?? todayIsoDate();

  const roster = await listAttendanceForDate(ampaId, { activityId, date: new Date(selectedDate) });

  return <AttendancePageContent roster={roster} date={selectedDate} />;
}

function AttendancePageContent({
  roster,
  date,
}: {
  roster: Awaited<ReturnType<typeof listAttendanceForDate>>;
  date: string;
}): React.ReactElement {
  const t = useTranslations("board.attendance");

  return (
    <>
      <PageHeader title={t("title")} />
      <Card className="mb-6">
        <form method="get" className="flex items-end gap-3">
          <div>
            <label htmlFor="attendance-date" className="mb-1 block text-sm font-medium text-ink-900">
              {t("date")}
            </label>
            <input
              id="attendance-date"
              type="date"
              name="date"
              defaultValue={date}
              className="h-10 rounded border border-border bg-surface px-3 text-sm text-ink-900"
            />
          </div>
          <Button type="submit" variant="secondary">
            {t("changeDate")}
          </Button>
        </form>
      </Card>
      <AttendanceRoster roster={roster} date={date} />
    </>
  );
}
