"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import {
  cancelEnrollment,
  createActivity,
  enrollStudentInActivity,
  type CreateActivityInput,
  type EnrollStudentInput,
} from "@/lib/activities";

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
