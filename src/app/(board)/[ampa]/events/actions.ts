"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import {
  cancelEventRegistration,
  createEvent,
  registerFamilyForEvent,
  type CreateEventInput,
  type RegisterFamilyForEventInput,
} from "@/lib/events";

export interface ActionResult {
  ok: boolean;
  error?: string;
  status?: string;
}

export async function createEventAction(input: CreateEventInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await createEvent(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("createEventAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el evento." };
  }
}

export async function registerFamilyForEventAction(input: RegisterFamilyForEventInput): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    const result = await registerFamilyForEvent(ampaId, input);
    return { ok: true, status: result.status };
  } catch (error) {
    console.error("registerFamilyForEventAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo inscribir a la familia." };
  }
}

export async function cancelEventRegistrationAction(registrationId: string): Promise<ActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");
  try {
    await cancelEventRegistration(ampaId, { registrationId });
    return { ok: true };
  } catch (error) {
    console.error("cancelEventRegistrationAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo cancelar la inscripción." };
  }
}
