"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { exportAmpaData } from "@/lib/export";

export interface ExportDataActionResult {
  ok: boolean;
  error?: string;
  json?: string;
}

export async function exportDataAction(): Promise<ExportDataActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_AMPA_SETTINGS");

  try {
    const data = await exportAmpaData(ampaId);
    return { ok: true, json: JSON.stringify(data, null, 2) };
  } catch (error) {
    console.error("exportDataAction failed:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo exportar los datos." };
  }
}
