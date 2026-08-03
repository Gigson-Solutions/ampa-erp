"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { createAnnouncement, type CreateAnnouncementInput } from "@/lib/announcements";

export interface CreateAnnouncementActionResult {
  ok: boolean;
  error?: string;
}

export async function createAnnouncementAction(
  input: CreateAnnouncementInput,
): Promise<CreateAnnouncementActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_COMMUNICATIONS");

  try {
    await createAnnouncement(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("createAnnouncementAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo publicar el comunicado.";
    return { ok: false, error: message };
  }
}
