import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Sistema de monitores (feedback de usuario, 2026-08-11) — activa el permiso
// `VIEW_OWN_ACTIVITIES` que existía en authz.ts desde Fase 0 y nunca se había
// usado. Mismo mecanismo de acceso que el resto de la app (login por magic
// link, sin contraseña) — "invitar" a un monitor es solo darle el rol
// `MONITOR` para esta AMPA, nada de credenciales que gestionar.

export interface MonitorSummary {
  userId: string;
  name: string | null;
  email: string;
}

export async function listMonitors(ampaId: string): Promise<MonitorSummary[]> {
  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const roles = await db.userAmpaRole.findMany({
      where: { ampaId: scopedAmpaId, role: "MONITOR" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return roles.map((role) => ({
      userId: role.userId,
      name: role.user.name,
      email: role.user.email,
    }));
  });
}

export const inviteMonitorSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Email no válido"),
});

export type InviteMonitorInput = z.infer<typeof inviteMonitorSchema>;

export async function inviteMonitor(ampaId: string, input: InviteMonitorInput): Promise<MonitorSummary> {
  const parsed = inviteMonitorSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const user = await db.user.upsert({
      where: { email: parsed.email },
      update: {},
      create: { email: parsed.email, name: parsed.name },
    });

    await db.userAmpaRole.upsert({
      where: { userId_ampaId_role: { userId: user.id, ampaId: scopedAmpaId, role: "MONITOR" } },
      update: {},
      create: { userId: user.id, ampaId: scopedAmpaId, role: "MONITOR" },
    });

    return { userId: user.id, name: user.name, email: user.email };
  });
}

export interface MonitoredActivitySummary {
  activityId: string;
  activityName: string;
  students: Array<{ studentName: string; familyReferenceCode: string; status: string }>;
}

/**
 * Vista del monitor: SOLO las actividades donde `monitorUserId` es él/ella
 * mismo/a, con sus inscripciones — nunca la lista completa de actividades
 * como ve la junta. Alcance v1: solo lectura (ver src/app/(board)/[ampa]/
 * my-activities/page.tsx) — el feedback pide "visualizar", no gestionar.
 */
export async function listMyMonitoredActivities(ampaId: string, userId: string): Promise<MonitoredActivitySummary[]> {
  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const activities = await db.activity.findMany({
      where: { ampaId: scopedAmpaId, monitorUserId: userId },
      include: {
        enrollments: {
          where: { status: { not: "CANCELLED" } },
          include: { student: { include: { family: true } } },
        },
      },
    });

    return activities.map((activity) => ({
      activityId: activity.id,
      activityName: activity.name,
      students: activity.enrollments.map((enrollment) => ({
        studentName: enrollment.student.name,
        familyReferenceCode: enrollment.student.family.referenceCode,
        status: enrollment.status,
      })),
    }));
  });
}

export const removeMonitorSchema = z.object({ userId: z.string().min(1) });

/**
 * Quita el rol de monitor — borra solo el `UserAmpaRole`, nunca el `User`
 * (podría tener otros roles o pertenecer a otras AMPAs).
 */
export async function removeMonitor(ampaId: string, input: { userId: string }): Promise<void> {
  const parsed = removeMonitorSchema.parse(input);

  await withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const role = await db.userAmpaRole.findUnique({
      where: { userId_ampaId_role: { userId: parsed.userId, ampaId: scopedAmpaId, role: "MONITOR" } },
    });
    if (!role) throw new Error("Este usuario no es monitor de esta AMPA");

    await db.userAmpaRole.delete({ where: { id: role.id } });
  });
}
