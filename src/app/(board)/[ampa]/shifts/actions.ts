"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import {
  createShiftTask,
  createShift,
  assignGuardianToShift,
  cancelShiftSignup,
  type CreateShiftTaskInput,
  type CreateShiftInput,
  type AssignGuardianToShiftInput,
} from "@/lib/shifts";

export interface ActionResult {
  ok: boolean;
  error?: string;
  status?: string;
}

export async function createShiftTaskAction(input: CreateShiftTaskInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await createShiftTask(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("createShiftTaskAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la tarea." };
  }
}

export async function createShiftAction(input: CreateShiftInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await createShift(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("createShiftAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el turno." };
  }
}

export async function assignGuardianAction(input: AssignGuardianToShiftInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    const result = await assignGuardianToShift(ampaId, input);
    return { ok: true, status: result.status };
  } catch (error) {
    console.error("assignGuardianAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo asignar a la persona." };
  }
}

export async function cancelShiftSignupAction(signupId: string): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await cancelShiftSignup(ampaId, { signupId });
    return { ok: true };
  } catch (error) {
    console.error("cancelShiftSignupAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo cancelar la asignación." };
  }
}
