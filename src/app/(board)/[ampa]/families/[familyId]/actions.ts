"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import {
  addStudentToFamily,
  addContactToFamily,
  type AddStudentToFamilyInput,
  type AddContactToFamilyInput,
} from "@/lib/family-management";
import { inviteGuardianToPortal } from "@/lib/family-portal";

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

export interface InvitePortalActionResult {
  ok: boolean;
  error?: string;
  email?: string;
}

/**
 * Solo prepara el acceso (User + UserAmpaRole FAMILIA) en el servidor — el
 * envío real del magic link lo dispara el cliente justo después con
 * `signIn("nodemailer", ...)`, reutilizando el mismo mecanismo que ya usa
 * `LoginForm.tsx` (ver InvitePortalButton.tsx).
 */
export async function invitePortalAction(guardianId: string): Promise<InvitePortalActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");

  try {
    const result = await inviteGuardianToPortal(ampaId, guardianId);
    return { ok: true, email: result.email };
  } catch (error) {
    console.error("invitePortalAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo invitar al portal.";
    return { ok: false, error: message };
  }
}
