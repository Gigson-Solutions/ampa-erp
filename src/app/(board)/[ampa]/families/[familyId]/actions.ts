"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { addStudentToFamily, type AddStudentToFamilyInput } from "@/lib/family-management";

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
