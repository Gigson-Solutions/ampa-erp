import { z } from "zod";
import { withAmpaScope, type TenantScopedClient } from "./tenant";
import type { Activity } from "@prisma/client";

// Fase 1 (ver roadmap): "extraescolares con plazas, lista de espera y rol
// proveedor/monitor". Ampliada en Fase 2 (feedback de usuario, 2026-08-11) con
// CRUD completo, sistema de monitores (ver src/lib/monitors.ts) y pago
// fraccionado configurable por actividad.

export const createActivitySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  academicYearId: z.string().min(1),
  providerId: z.string().min(1).optional(),
  monitorUserId: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  price: z.number().min(0),
  // Pago fraccionado (feedback de usuario, 2026-08-11): `installmentCount`
  // ausente o `1` = cobro único, como cualquier extraescolar. Un valor mayor
  // reparte `price` en esa cantidad de plazos, espaciados
  // `installmentRecurrenceDays` días entre sí (por defecto 30 = mensual).
  installmentCount: z.number().int().positive().optional(),
  installmentRecurrenceDays: z.number().int().positive().optional(),
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
        monitorUserId: parsed.monitorUserId,
        name: parsed.name,
        capacity: parsed.capacity,
        price: parsed.price,
        installmentCount: parsed.installmentCount,
        installmentRecurrenceDays: parsed.installmentRecurrenceDays,
      },
    });

    return { id: activity.id };
  });
}

// Deliberadamente SIN `providerId` — el formulario de edición (ActivityRow.tsx)
// no ofrece cambiar el proveedor (nunca hubo un selector en la UI para eso,
// solo era asignable por script/seed), así que no se toca en el update: si
// se incluyera aquí como opcional, cada guardado sin ese campo lo pondría a
// `null` sin querer, borrando un dato que ni siquiera se mostró en el
// formulario.
export const updateActivitySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  monitorUserId: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  price: z.number().min(0),
  installmentCount: z.number().int().positive().optional(),
  installmentRecurrenceDays: z.number().int().positive().optional(),
});

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export async function updateActivity(
  ampaId: string,
  activityId: string,
  input: UpdateActivityInput,
): Promise<void> {
  const parsed = updateActivitySchema.parse(input);

  await withAmpaScope(ampaId, async (db) => {
    const activity = await db.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new Error("Actividad no encontrada para esta AMPA");

    await db.activity.update({
      where: { id: activityId },
      data: {
        name: parsed.name,
        monitorUserId: parsed.monitorUserId ?? null,
        capacity: parsed.capacity ?? null,
        price: parsed.price,
        installmentCount: parsed.installmentCount ?? null,
        installmentRecurrenceDays: parsed.installmentRecurrenceDays ?? null,
      },
    });
  });
}

/**
 * Borra una actividad — con guarda: no se puede borrar si tiene inscripciones
 * activas (`ENROLLED`/`WAITLISTED`), hay que cancelarlas primero. Mismo
 * criterio conservador que ya usa `cancelEnrollment`: nunca borrado en
 * cascada silencioso de datos ligados a familias.
 */
export async function deleteActivity(ampaId: string, activityId: string): Promise<void> {
  await withAmpaScope(ampaId, async (db) => {
    const activity = await db.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new Error("Actividad no encontrada para esta AMPA");

    const activeEnrollments = await db.activityEnrollment.count({
      where: { activityId, status: { in: ["ENROLLED", "WAITLISTED"] } },
    });
    if (activeEnrollments > 0) {
      throw new Error("No se puede borrar una actividad con inscripciones activas — cancélalas primero");
    }

    await db.activity.delete({ where: { id: activityId } });
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
 * Genera el/los `Charge` de una inscripción confirmada (nunca en lista de
 * espera, mismo criterio que `registerFamilyForEvent`). Hallazgo real
 * (2026-08-11): `enrollStudentInActivity` nunca había generado ningún cargo a
 * pesar de que `Activity.price` existe desde Fase 0 — nadie lo había
 * necesitado hasta que el pago fraccionado (antes pensado como "viaje de fin
 * de curso" aparte) se fusionó aquí.
 */
async function generateEnrollmentCharges(
  db: TenantScopedClient,
  scopedAmpaId: string,
  activity: Activity,
  familyId: string,
): Promise<void> {
  const price = activity.price.toNumber();
  if (price <= 0) return;

  const installments = activity.installmentCount && activity.installmentCount > 1 ? activity.installmentCount : 1;
  const recurrenceDays = activity.installmentRecurrenceDays ?? 30;
  const amountPerInstallment = Math.round((price / installments) * 100) / 100;
  const now = new Date();

  for (let index = 0; index < installments; index++) {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + index * recurrenceDays);

    await db.charge.create({
      data: {
        ampaId: scopedAmpaId,
        familyId,
        concept:
          installments > 1
            ? `Actividad: ${activity.name} (plazo ${index + 1}/${installments})`
            : `Actividad: ${activity.name}`,
        amount: amountPerInstallment,
        dueDate,
        status: "PENDING",
      },
    });
  }
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
    // Family/Activity) — hay que verificar la pertenencia a la AMPA a mano. El
    // `include: { family: true }` puede llegar `null` en tiempo de ejecución
    // para un `Student` de otra AMPA (ver lección documentada en
    // src/lib/members.ts) — comprobación explícita, no asumir que siempre viene
    // poblado aunque el tipo generado por Prisma lo marque como obligatorio.
    const student = await db.student.findUnique({
      where: { id: parsed.studentId },
      include: { family: true },
    });
    if (!student || !student.family || student.family.ampaId !== scopedAmpaId) {
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

    if (status === "ENROLLED") {
      await generateEnrollmentCharges(db, scopedAmpaId, activity, student.familyId);
    }

    return { enrollmentId: enrollment.id, status };
  });
}

export const cancelEnrollmentSchema = z.object({ enrollmentId: z.string().min(1) });

/**
 * Cancela una inscripción y, si estaba `ENROLLED` (liberando una plaza),
 * promociona automáticamente al primero de la lista de espera (FIFO por fecha de
 * inscripción), si lo hay — generando también su cargo correspondiente, igual
 * que en una inscripción directa.
 */
export async function cancelEnrollment(ampaId: string, input: { enrollmentId: string }): Promise<void> {
  const parsed = cancelEnrollmentSchema.parse(input);

  await withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const enrollment = await db.activityEnrollment.findUnique({
      where: { id: parsed.enrollmentId },
      include: { activity: true },
    });
    if (!enrollment || !enrollment.activity || enrollment.activity.ampaId !== scopedAmpaId) {
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
        include: { student: true },
      });
      if (nextInWaitlist) {
        await db.activityEnrollment.update({ where: { id: nextInWaitlist.id }, data: { status: "ENROLLED" } });
        await generateEnrollmentCharges(db, scopedAmpaId, enrollment.activity, nextInWaitlist.student.familyId);
      }
    }
  });
}
