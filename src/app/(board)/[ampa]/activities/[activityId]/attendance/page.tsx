import { useTranslations } from "next-intl";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { listAttendanceForDate } from "@/lib/attendance";
import { AttendanceRoster } from "./AttendanceRoster";

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
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <form method="get" className="mt-4">
        <label htmlFor="attendance-date">{t("date")}</label>
        <input id="attendance-date" type="date" name="date" defaultValue={date} />
        <button type="submit">{t("changeDate")}</button>
      </form>
      <div className="mt-6">
        <AttendanceRoster roster={roster} date={date} />
      </div>
    </main>
  );
}
