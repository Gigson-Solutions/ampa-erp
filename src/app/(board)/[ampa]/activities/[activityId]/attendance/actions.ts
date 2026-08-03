"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { recordAttendance, type RecordAttendanceInput } from "@/lib/attendance";

export interface RecordAttendanceActionResult {
  ok: boolean;
  error?: string;
}

export async function recordAttendanceAction(input: RecordAttendanceInput): Promise<RecordAttendanceActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_ACTIVITIES");

  try {
    await recordAttendance(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("recordAttendanceAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo registrar la asistencia.";
    return { ok: false, error: message };
  }
}
