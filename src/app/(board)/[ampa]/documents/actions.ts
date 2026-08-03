"use server";

import { requireAmpaRole } from "@/lib/require-ampa-session";
import { createDocument, type CreateDocumentInput } from "@/lib/documents";

export interface CreateDocumentActionResult {
  ok: boolean;
  error?: string;
}

export async function createDocumentAction(input: CreateDocumentInput): Promise<CreateDocumentActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_COMMUNICATIONS");

  try {
    await createDocument(ampaId, input);
    return { ok: true };
  } catch (error) {
    console.error("createDocumentAction failed:", error);
    const message = error instanceof Error ? error.message : "No se pudo añadir el documento.";
    return { ok: false, error: message };
  }
}
