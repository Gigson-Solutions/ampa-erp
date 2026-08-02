"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { createMembershipWithCharge, type CreateMembershipInput } from "@/lib/membership";

export interface CreateMembershipActionResult {
  ok: boolean;
  error?: string;
  chargeId?: string;
  amount?: number;
}

export async function createMembershipAction(
  input: CreateMembershipInput,
): Promise<CreateMembershipActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");

  try {
    const result = await createMembershipWithCharge(ampaId, input);
    return { ok: true, chargeId: result.chargeId, amount: result.amount };
  } catch (error) {
    console.error("createMembershipAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo crear la membresía.";
    return { ok: false, error: message };
  }
}
