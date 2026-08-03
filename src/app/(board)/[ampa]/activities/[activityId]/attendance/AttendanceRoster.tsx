"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordAttendanceAction } from "./actions";
import type { AttendanceRosterEntry } from "@/lib/attendance";

interface AttendanceRosterProps {
  roster: AttendanceRosterEntry[];
  date: string;
}

export function AttendanceRoster({ roster, date }: AttendanceRosterProps): React.ReactElement {
  const t = useTranslations("board.attendance");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleToggle(enrollmentId: string, present: boolean): Promise<void> {
    setPendingId(enrollmentId);
    const result = await recordAttendanceAction({ enrollmentId, date: new Date(date), present });
    setPendingId(null);
    if (result.ok) {
      router.refresh();
    } else {
      console.error(result.error);
    }
  }

  if (roster.length === 0) {
    return <p>{t("noEnrolled")}</p>;
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th>{t("student")}</th>
          <th>{t("family")}</th>
          <th>{t("present")}</th>
          <th>{t("absent")}</th>
        </tr>
      </thead>
      <tbody>
        {roster.map((entry) => (
          <tr key={entry.enrollmentId}>
            <td>{entry.studentName}</td>
            <td>{entry.familyReferenceCode}</td>
            <td>
              <button
                type="button"
                disabled={pendingId === entry.enrollmentId}
                onClick={() => handleToggle(entry.enrollmentId, true)}
                aria-pressed={entry.present === true}
              >
                {entry.present === true ? "✅" : "○"}
              </button>
            </td>
            <td>
              <button
                type="button"
                disabled={pendingId === entry.enrollmentId}
                onClick={() => handleToggle(entry.enrollmentId, false)}
                aria-pressed={entry.present === false}
              >
                {entry.present === false ? "✅" : "○"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
