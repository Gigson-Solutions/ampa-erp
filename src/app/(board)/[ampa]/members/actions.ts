"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { endMembership } from "@/lib/members";

export interface EndMembershipActionResult {
  ok: boolean;
  error?: string;
}

export async function endMembershipAction(guardianId: string): Promise<EndMembershipActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");

  try {
    await endMembership(ampaId, { guardianId });
    return { ok: true };
  } catch (error) {
    console.error("endMembershipAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo dar de baja al socio/a.";
    return { ok: false, error: message };
  }
}
