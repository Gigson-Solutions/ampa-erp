import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Gestión de turnos (Fase 2, renombrada de "voluntariado por turnos" a
// petición del usuario, 2026-08-11): tareas puntuales de voluntariado (barra
// en una fiesta, montaje/desmontaje, guardia en una excursión...), cada una
// con uno o varios turnos concretos (fecha, hora, lugar), asignados a una
// PERSONA (`Guardian`: tutor legal o contacto) — no a una familia entera,
// primera vez en el proyecto que una inscripción se liga directamente a un
// `Guardian`. v1 = la junta asigna los turnos, sin autoservicio desde el
// portal de familias (mismo criterio que extraescolares/eventos hoy).

export const createShiftTaskSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z.string().trim().min(1).optional(),
});

export type CreateShiftTaskInput = z.infer<typeof createShiftTaskSchema>;

export async function createShiftTask(ampaId: string, input: CreateShiftTaskInput): Promise<{ id: string }> {
  const parsed = createShiftTaskSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const task = await db.shiftTask.create({
      data: { ampaId: scopedAmpaId, name: parsed.name, description: parsed.description },
    });
    return { id: task.id };
  });
}

export const createShiftSchema = z.object({
  taskId: z.string().min(1),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  location: z.string().trim().min(1, "El lugar es obligatorio"),
  capacity: z.number().int().positive().optional(),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export async function createShift(ampaId: string, input: CreateShiftInput): Promise<{ id: string }> {
  const parsed = createShiftSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const task = await db.shiftTask.findUnique({ where: { id: parsed.taskId } });
    if (!task || task.ampaId !== scopedAmpaId) {
      throw new Error("Tarea de turno no encontrada para esta AMPA");
    }

    const shift = await db.shift.create({
      data: {
        taskId: parsed.taskId,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        location: parsed.location,
        capacity: parsed.capacity,
      },
    });
    return { id: shift.id };
  });
}

export const assignGuardianToShiftSchema = z.object({
  shiftId: z.string().min(1),
  guardianId: z.string().min(1),
});

export type AssignGuardianToShiftInput = z.infer<typeof assignGuardianToShiftSchema>;
export type ShiftSignupStatus = "SIGNED_UP" | "WAITLISTED";

export interface AssignGuardianToShiftResult {
  signupId: string;
  status: ShiftSignupStatus;
}

/**
 * Asigna a una persona (tutor legal o contacto) a un turno. Si no quedan
 * plazas (`capacity` no nulo y ya alcanzado), queda en lista de espera en vez
 * de rechazarse. Bloquea la fila del `Shift` (`FOR UPDATE`) mientras cuenta
 * plazas — mismo patrón que `enrollStudentInActivity`.
 */
export async function assignGuardianToShift(
  ampaId: string,
  input: AssignGuardianToShiftInput,
): Promise<AssignGuardianToShiftResult> {
  const parsed = assignGuardianToShiftSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const shift = await db.shift.findUnique({ where: { id: parsed.shiftId }, include: { task: true } });
    if (!shift || !shift.task || shift.task.ampaId !== scopedAmpaId) {
      throw new Error("Turno no encontrado para esta AMPA");
    }

    // `Guardian` no lleva `ampaId` propio — se aísla vía `Family`, y el
    // `include` puede llegar `null` en tiempo de ejecución para un `Guardian`
    // de otra AMPA (misma guarda explícita ya documentada en members.ts).
    const guardian = await db.guardian.findUnique({ where: { id: parsed.guardianId }, include: { family: true } });
    if (!guardian || !guardian.family || guardian.family.ampaId !== scopedAmpaId) {
      throw new Error("Persona no encontrada para esta AMPA");
    }

    const existing = await db.shiftSignup.findUnique({
      where: { shiftId_guardianId: { shiftId: shift.id, guardianId: guardian.id } },
    });
    if (existing && existing.status !== "CANCELLED") {
      throw new Error("Esta persona ya está asignada o en lista de espera en este turno");
    }

    await db.$queryRaw`SELECT id FROM shifts WHERE id = ${shift.id} FOR UPDATE`;

    const signedUpCount = await db.shiftSignup.count({
      where: { shiftId: shift.id, status: "SIGNED_UP" },
    });

    const status: ShiftSignupStatus =
      shift.capacity !== null && signedUpCount >= shift.capacity ? "WAITLISTED" : "SIGNED_UP";

    const signup = existing
      ? await db.shiftSignup.update({ where: { id: existing.id }, data: { status } })
      : await db.shiftSignup.create({ data: { shiftId: shift.id, guardianId: guardian.id, status } });

    return { signupId: signup.id, status };
  });
}

export const cancelShiftSignupSchema = z.object({ signupId: z.string().min(1) });

/**
 * Cancela una asignación y, si estaba `SIGNED_UP` (liberando una plaza),
 * promociona automáticamente a la primera persona en lista de espera (FIFO) —
 * mismo criterio que `cancelEnrollment`.
 */
export async function cancelShiftSignup(ampaId: string, input: { signupId: string }): Promise<void> {
  const parsed = cancelShiftSignupSchema.parse(input);

  await withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const signup = await db.shiftSignup.findUnique({
      where: { id: parsed.signupId },
      include: { shift: { include: { task: true } } },
    });
    if (!signup || !signup.shift || !signup.shift.task || signup.shift.task.ampaId !== scopedAmpaId) {
      throw new Error("Asignación no encontrada para esta AMPA");
    }
    if (signup.status === "CANCELLED") return;

    await db.$queryRaw`SELECT id FROM shifts WHERE id = ${signup.shiftId} FOR UPDATE`;

    const wasSignedUp = signup.status === "SIGNED_UP";

    await db.shiftSignup.update({ where: { id: signup.id }, data: { status: "CANCELLED" } });

    if (wasSignedUp) {
      const nextInWaitlist = await db.shiftSignup.findFirst({
        where: { shiftId: signup.shiftId, status: "WAITLISTED" },
        orderBy: { createdAt: "asc" },
      });
      if (nextInWaitlist) {
        await db.shiftSignup.update({ where: { id: nextInWaitlist.id }, data: { status: "SIGNED_UP" } });
      }
    }
  });
}

export interface ShiftSignupSummary {
  id: string;
  guardianName: string;
  familyReferenceCode: string;
  status: string;
}

export interface ShiftSummary {
  id: string;
  startsAt: Date;
  endsAt: Date;
  location: string;
  capacity: number | null;
  signedUpCount: number;
  waitlistedCount: number;
  signups: ShiftSignupSummary[];
}

export interface ShiftTaskSummary {
  id: string;
  name: string;
  description: string | null;
  shifts: ShiftSummary[];
}

export async function listShiftTasks(ampaId: string): Promise<ShiftTaskSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const tasks = await db.shiftTask.findMany({
      include: {
        shifts: {
          include: {
            signups: {
              where: { status: { not: "CANCELLED" } },
              include: { guardian: { include: { family: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { startsAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description,
      shifts: task.shifts.map((shift) => ({
        id: shift.id,
        startsAt: shift.startsAt,
        endsAt: shift.endsAt,
        location: shift.location,
        capacity: shift.capacity,
        signedUpCount: shift.signups.filter((s) => s.status === "SIGNED_UP").length,
        waitlistedCount: shift.signups.filter((s) => s.status === "WAITLISTED").length,
        signups: shift.signups.map((signup) => ({
          id: signup.id,
          guardianName: signup.guardian.name,
          familyReferenceCode: signup.guardian.family.referenceCode,
          status: signup.status,
        })),
      })),
    }));
  });
}
