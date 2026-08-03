import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 1 (ver roadmap): "asistencia" — para extraescolares, ligada a la
// inscripción (`ActivityEnrollment`), no directamente al alumno/a, porque solo
// tiene sentido pasar lista de quien está `ENROLLED` en esa actividad.

export const recordAttendanceSchema = z.object({
  enrollmentId: z.string().min(1),
  date: z.coerce.date(),
  present: z.boolean(),
});

export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;

/**
 * Marca la asistencia de una inscripción para un día concreto. Si ya había un
 * registro para esa (inscripción, fecha), lo corrige (upsert) en vez de duplicar.
 * Solo se puede marcar asistencia de inscripciones `ENROLLED` — no tiene sentido
 * pasar lista a quien está en lista de espera o canceló.
 */
export async function recordAttendance(ampaId: string, input: RecordAttendanceInput): Promise<{ id: string }> {
  const parsed = recordAttendanceSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const enrollment = await db.activityEnrollment.findUnique({
      where: { id: parsed.enrollmentId },
      include: { activity: true },
    });
    if (!enrollment || enrollment.activity.ampaId !== scopedAmpaId) {
      throw new Error("Inscripción no encontrada para esta AMPA");
    }
    if (enrollment.status !== "ENROLLED") {
      throw new Error("Solo se puede pasar lista a inscripciones activas (ENROLLED)");
    }

    // Normaliza a medianoche para que la parte horaria nunca rompa la unicidad
    // por (enrollmentId, date) — la columna es `@db.Date` (sin hora) pero el
    // valor que le pasamos desde JS sigue siendo un Date con hora.
    const day = new Date(parsed.date);
    day.setUTCHours(0, 0, 0, 0);

    const record = await db.attendanceRecord.upsert({
      where: { enrollmentId_date: { enrollmentId: enrollment.id, date: day } },
      update: { present: parsed.present },
      create: { enrollmentId: enrollment.id, date: day, present: parsed.present },
    });

    return { id: record.id };
  });
}

export interface AttendanceRosterEntry {
  enrollmentId: string;
  studentName: string;
  familyReferenceCode: string;
  present: boolean | null; // null = todavía no registrada ese día
}

/**
 * Lista de alumnos/as inscritos/as (`ENROLLED`) en una actividad para un día
 * concreto, con su asistencia si ya se registró (`null` si aún no).
 */
export async function listAttendanceForDate(
  ampaId: string,
  input: { activityId: string; date: Date },
): Promise<AttendanceRosterEntry[]> {
  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const activity = await db.activity.findUnique({ where: { id: input.activityId } });
    if (!activity || activity.ampaId !== scopedAmpaId) return [];

    const day = new Date(input.date);
    day.setUTCHours(0, 0, 0, 0);

    const enrollments = await db.activityEnrollment.findMany({
      where: { activityId: input.activityId, status: "ENROLLED" },
      include: { student: { include: { family: true } }, attendanceRecords: { where: { date: day } } },
      orderBy: { createdAt: "asc" },
    });

    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentName: enrollment.student.name,
      familyReferenceCode: enrollment.student.family.referenceCode,
      present: enrollment.attendanceRecords[0]?.present ?? null,
    }));
  });
}
