"use server";

import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import {
  createAmpa,
  updateAmpa,
  invitePlatformAdmin,
  removePlatformAdmin,
  type CreateAmpaInput,
  type UpdateAmpaInput,
  type InvitePlatformAdminInput,
} from "@/lib/platform-admin";

export interface AdminActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createAmpaAction(input: CreateAmpaInput): Promise<AdminActionResult> {
  await requirePlatformAdmin();
  try {
    const result = await createAmpa(input);
    return { ok: true, id: result.id };
  } catch (error) {
    console.error("createAmpaAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la AMPA." };
  }
}

export async function updateAmpaAction(ampaId: string, input: UpdateAmpaInput): Promise<AdminActionResult> {
  await requirePlatformAdmin();
  try {
    await updateAmpa(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("updateAmpaAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar la AMPA." };
  }
}

export async function invitePlatformAdminAction(input: InvitePlatformAdminInput): Promise<AdminActionResult> {
  await requirePlatformAdmin();
  try {
    await invitePlatformAdmin(input);
    return { ok: true };
  } catch (error) {
    console.error("invitePlatformAdminAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo invitar al superadmin." };
  }
}

export async function removePlatformAdminAction(userId: string): Promise<AdminActionResult> {
  await requirePlatformAdmin();
  try {
    await removePlatformAdmin(userId);
    return { ok: true };
  } catch (error) {
    console.error("removePlatformAdminAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo quitar el rol de superadmin." };
  }
}
