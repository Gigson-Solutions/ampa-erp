"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import {
  addStudentToFamily,
  addContactToFamily,
  type AddStudentToFamilyInput,
  type AddContactToFamilyInput,
} from "@/lib/family-management";

export interface AddStudentActionResult {
  ok: boolean;
  error?: string;
}

export async function addStudentAction(
  familyId: string,
  input: AddStudentToFamilyInput,
): Promise<AddStudentActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");

  try {
    await addStudentToFamily(ampaId, familyId, input);
    return { ok: true };
  } catch (error) {
    console.error("addStudentAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo añadir el alumno/a.";
    return { ok: false, error: message };
  }
}

export interface AddContactActionResult {
  ok: boolean;
  error?: string;
}

export async function addContactAction(
  familyId: string,
  input: AddContactToFamilyInput,
): Promise<AddContactActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");

  try {
    await addContactToFamily(ampaId, familyId, input);
    return { ok: true };
  } catch (error) {
    console.error("addContactAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo añadir la persona de contacto.";
    return { ok: false, error: message };
  }
}
