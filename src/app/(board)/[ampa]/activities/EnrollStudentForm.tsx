"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { enrollStudentAction } from "./actions";
import type { ActivitySummary, StudentSummary } from "@/lib/board-directory";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Label, Select } from "@/components/ui/Input";

interface EnrollStudentFormProps {
  activities: ActivitySummary[];
  students: StudentSummary[];
}

export function EnrollStudentForm({ activities, students }: EnrollStudentFormProps): React.ReactElement {
  const t = useTranslations("board.activities");
  const router = useRouter();

  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  // Feedback de usuario (2026-08-11): el desplegable de alumno/a se vuelve
  // inmanejable con muchas familias — filtro en cliente por nombre (el
  // volumen de alumnos por AMPA es bajo, no hace falta buscar en servidor).
  const [studentSearch, setStudentSearch] = useState("");
  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) => student.name.toLowerCase().includes(query));
  }, [students, studentSearch]);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const effectiveStudentId = filteredStudents.some((s) => s.id === studentId) ? studentId : filteredStudents[0]?.id;
    if (!effectiveStudentId) return;

    const result = await enrollStudentAction({ activityId, studentId: effectiveStudentId });

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
    return <Alert variant="error">{t("noActivitiesOrStudents")}</Alert>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField>
        <Label htmlFor="enroll-activity">{t("activity")}</Label>
        <Select id="enroll-activity" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name} ({activity.enrolledCount}
              {activity.capacity !== null ? `/${activity.capacity}` : ""})
            </option>
          ))}
        </Select>
      </FormField>
      <FormField>
        <Label htmlFor="enroll-student-search">{t("searchStudent")}</Label>
        <Input
          id="enroll-student-search"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          placeholder={t("searchStudentPlaceholder")}
        />
      </FormField>
      <FormField>
        <Label htmlFor="enroll-student">{t("student")}</Label>
        {filteredStudents.length === 0 ? (
          <p className="text-sm text-ink-700">{t("noStudentsMatch")}</p>
        ) : (
          <Select
            id="enroll-student"
            value={filteredStudents.some((s) => s.id === studentId) ? studentId : filteredStudents[0]!.id}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {filteredStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} ({student.familyReferenceCode})
              </option>
            ))}
          </Select>
        )}
      </FormField>
      {message && <Alert variant={status === "error" ? "error" : "success"}>{message}</Alert>}
      <Button type="submit" disabled={status === "submitting"} variant="secondary">
        {status === "submitting" ? t("submitting") : t("enroll")}
      </Button>
    </form>
  );
}
