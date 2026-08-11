"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import {
  cancelEnrollment,
  createActivity,
  enrollStudentInActivity,
  updateActivity,
  deleteActivity,
  type CreateActivityInput,
  type EnrollStudentInput,
  type UpdateActivityInput,
} from "@/lib/activities";
import { inviteMonitor, removeMonitor, type InviteMonitorInput } from "@/lib/monitors";

export interface ActionResult {
  ok: boolean;
  error?: string;
  status?: string;
}

export async function createActivityAction(input: CreateActivityInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await createActivity(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("createActivityAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la actividad." };
  }
}

export async function updateActivityAction(activityId: string, input: UpdateActivityInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await updateActivity(ampaId, activityId, input);
    return { ok: true };
  } catch (error) {
    console.error("updateActivityAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar la actividad." };
  }
}

export async function deleteActivityAction(activityId: string): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await deleteActivity(ampaId, activityId);
    return { ok: true };
  } catch (error) {
    console.error("deleteActivityAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo borrar la actividad." };
  }
}

export async function enrollStudentAction(input: EnrollStudentInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    const result = await enrollStudentInActivity(ampaId, input);
    return { ok: true, status: result.status };
  } catch (error) {
    console.error("enrollStudentAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo inscribir al alumno/a." };
  }
}

export async function cancelEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await cancelEnrollment(ampaId, { enrollmentId });
    return { ok: true };
  } catch (error) {
    console.error("cancelEnrollmentAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo cancelar la inscripción." };
  }
}

export async function inviteMonitorAction(input: InviteMonitorInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await inviteMonitor(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("inviteMonitorAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo invitar al monitor/a." };
  }
}

export async function removeMonitorAction(userId: string): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await removeMonitor(ampaId, { userId });
    return { ok: true };
  } catch (error) {
    console.error("removeMonitorAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo quitar al monitor/a." };
  }
}
