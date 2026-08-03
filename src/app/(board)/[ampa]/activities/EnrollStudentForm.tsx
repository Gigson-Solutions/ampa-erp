"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { enrollStudentAction } from "./actions";
import type { ActivitySummary, StudentSummary } from "@/lib/board-directory";

interface EnrollStudentFormProps {
  activities: ActivitySummary[];
  students: StudentSummary[];
}

export function EnrollStudentForm({ activities, students }: EnrollStudentFormProps): React.ReactElement {
  const t = useTranslations("board.activities");
  const router = useRouter();

  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const result = await enrollStudentAction({ activityId, studentId });

    if (result.ok) {
      setStatus("idle");
      setMessage(result.status === "WAITLISTED" ? t("waitlisted") : t("enrolled"));
      router.refresh();
    } else {
      setStatus("error");
      setMessage(result.error ?? t("genericError"));
    }
  }

  if (activities.length === 0 || students.length === 0) {
    return <p role="alert">{t("noActivitiesOrStudents")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="enroll-activity">{t("activity")}</label>
        <select id="enroll-activity" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name} ({activity.enrolledCount}
              {activity.capacity !== null ? `/${activity.capacity}` : ""})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="enroll-student">{t("student")}</label>
        <select id="enroll-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name} ({student.familyReferenceCode})
            </option>
          ))}
        </select>
      </div>
      {message && <p role={status === "error" ? "alert" : "status"}>{message}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? t("submitting") : t("enroll")}
      </button>
    </form>
  );
}
