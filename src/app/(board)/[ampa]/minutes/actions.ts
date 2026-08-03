"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import {
  createMinutesEntry,
  verifyMinutesChain,
  type CreateMinutesEntryInput,
  type MinutesChainVerification,
} from "@/lib/minutes";

export interface CreateMinutesEntryActionResult {
  ok: boolean;
  error?: string;
}

export async function createMinutesEntryAction(
  input: CreateMinutesEntryInput,
): Promise<CreateMinutesEntryActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");

  try {
    await createMinutesEntry(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("createMinutesEntryAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo guardar el acta.";
    return { ok: false, error: message };
  }
}

export async function verifyMinutesChainAction(): Promise<MinutesChainVerification> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");
  return verifyMinutesChain(ampaId);
}
