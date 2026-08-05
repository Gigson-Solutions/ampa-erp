"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import { recordAttendanceAction } from "./actions";
import type { AttendanceRosterEntry } from "@/lib/attendance";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";

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
    return (
      <Card>
        <p className="text-sm text-ink-700">{t("noEnrolled")}</p>
      </Card>
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>{t("student")}</TH>
          <TH>{t("family")}</TH>
          <TH>{t("present")}</TH>
          <TH>{t("absent")}</TH>
        </TR>
      </THead>
      <TBody>
        {roster.map((entry) => (
          <TR key={entry.enrollmentId}>
            <TD className="font-medium">{entry.studentName}</TD>
            <TD>{entry.familyReferenceCode}</TD>
            <TD>
              <button
                type="button"
                disabled={pendingId === entry.enrollmentId}
                onClick={() => handleToggle(entry.enrollmentId, true)}
                aria-pressed={entry.present === true}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-success-fg transition-colors disabled:opacity-50 aria-pressed:bg-success-bg"
              >
                {entry.present === true ? <Check size={16} /> : <Circle size={12} className="text-ink-400" />}
              </button>
            </TD>
            <TD>
              <button
                type="button"
                disabled={pendingId === entry.enrollmentId}
                onClick={() => handleToggle(entry.enrollmentId, false)}
                aria-pressed={entry.present === false}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-danger-fg transition-colors disabled:opacity-50 aria-pressed:bg-danger-bg"
              >
                {entry.present === false ? <Check size={16} /> : <Circle size={12} className="text-ink-400" />}
              </button>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
