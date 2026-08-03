import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 1 (ver roadmap): "extraescolares con plazas, lista de espera y rol
// proveedor/monitor". Esta pieza cubre plazas + lista de espera; el rol
// proveedor/monitor (acceso limitado a sus propias actividades) queda para cuando
// exista el portal de proveedores — de momento la inscripción es una acción de
// junta (`MANAGE_ACTIVITIES`), no autoservicio de familias (el portal de familias
// autenticadas, más allá del alta pública, todavía no existe).

export const createActivitySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  academicYearId: z.string().min(1),
  providerId: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  price: z.number().min(0),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export async function createActivity(ampaId: string, input: CreateActivityInput): Promise<{ id: string }> {
  const parsed = createActivitySchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const academicYear = await db.academicYear.findUnique({ where: { id: parsed.academicYearId } });
    if (!academicYear) throw new Error("AcademicYear no encontrado para esta AMPA");

    const activity = await db.activity.create({
      data: {
        ampaId: scopedAmpaId,
        academicYearId: parsed.academicYearId,
        providerId: parsed.providerId,
        name: parsed.name,
        capacity: parsed.capacity,
        price: parsed.price,
      },
    });

    return { id: activity.id };
  });
}

export const enrollStudentSchema = z.object({
  activityId: z.string().min(1),
  studentId: z.string().min(1),
});

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
export type EnrollmentStatus = "ENROLLED" | "WAITLISTED";

export interface EnrollStudentResult {
  enrollmentId: string;
  status: EnrollmentStatus;
}

/**
 * Inscribe a un alumno/a en una actividad. Si no quedan plazas (`capacity` no
 * nulo y ya alcanzado), lo deja en lista de espera en vez de rechazar la
 * inscripción. Bloquea la fila de la actividad (`FOR UPDATE`) mientras cuenta
 * plazas para que dos altas simultáneas no puedan ocupar la última plaza a la vez.
 */
export async function enrollStudentInActivity(
  ampaId: string,
  input: EnrollStudentInput,
): Promise<EnrollStudentResult> {
  const parsed = enrollStudentSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const activity = await db.activity.findUnique({ where: { id: parsed.activityId } });
    if (!activity) throw new Error("Actividad no encontrada para esta AMPA");

    // Student/ActivityEnrollment no llevan `ampaId` propio (se aíslan a través de
    // Family/Activity) — hay que verificar la pertenencia a la AMPA a mano.
    const student = await db.student.findUnique({
      where: { id: parsed.studentId },
      include: { family: true },
    });
    if (!student || student.family.ampaId !== scopedAmpaId) {
      throw new Error("Alumno/a no encontrado/a para esta AMPA");
    }

    const existing = await db.activityEnrollment.findUnique({
      where: { activityId_studentId: { activityId: activity.id, studentId: student.id } },
    });
    if (existing && existing.status !== "CANCELLED") {
      throw new Error("Este alumno/a ya está inscrito/a o en lista de espera en esta actividad");
    }

    await db.$queryRaw`SELECT id FROM activities WHERE id = ${activity.id} FOR UPDATE`;

    const enrolledCount = await db.activityEnrollment.count({
      where: { activityId: activity.id, status: "ENROLLED" },
    });

    const status: EnrollmentStatus =
      activity.capacity !== null && enrolledCount >= activity.capacity ? "WAITLISTED" : "ENROLLED";

    const enrollment = existing
      ? await db.activityEnrollment.update({ where: { id: existing.id }, data: { status } })
      : await db.activityEnrollment.create({
          data: { activityId: activity.id, studentId: student.id, status },
        });

    return { enrollmentId: enrollment.id, status };
  });
}

export const cancelEnrollmentSchema = z.object({ enrollmentId: z.string().min(1) });

/**
 * Cancela una inscripción y, si estaba `ENROLLED` (liberando una plaza),
 * promociona automáticamente al primero de la lista de espera (FIFO por fecha de
 * inscripción), si lo hay.
 */
export async function cancelEnrollment(ampaId: string, input: { enrollmentId: string }): Promise<void> {
  const parsed = cancelEnrollmentSchema.parse(input);

  await withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const enrollment = await db.activityEnrollment.findUnique({
      where: { id: parsed.enrollmentId },
      include: { activity: true },
    });
    if (!enrollment || enrollment.activity.ampaId !== scopedAmpaId) {
      throw new Error("Inscripción no encontrada para esta AMPA");
    }
    if (enrollment.status === "CANCELLED") return;

    await db.$queryRaw`SELECT id FROM activities WHERE id = ${enrollment.activityId} FOR UPDATE`;

    const wasEnrolled = enrollment.status === "ENROLLED";

    await db.activityEnrollment.update({ where: { id: enrollment.id }, data: { status: "CANCELLED" } });

    if (wasEnrolled) {
      const nextInWaitlist = await db.activityEnrollment.findFirst({
        where: { activityId: enrollment.activityId, status: "WAITLISTED" },
        orderBy: { createdAt: "asc" },
      });
      if (nextInWaitlist) {
        await db.activityEnrollment.update({ where: { id: nextInWaitlist.id }, data: { status: "ENROLLED" } });
      }
    }
  });
}
