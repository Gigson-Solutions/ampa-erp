"use server";

import { headers } from "next/headers";
import { requireAmpaRole } from "@/lib/require-ampa-session";
import { registerFamily, registerFamilySchema, type RegisterFamilyInput } from "@/lib/family-registration";
import { getOrCreateFamilyCardToken } from "@/lib/card";

export interface CreateFamilyActionResult {
  ok: boolean;
  error?: string;
  referenceCode?: string;
}

async function resolveRequestIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Alta de familia desde el panel de junta (feedback de usuario, 2026-08-11):
 * para altas presenciales/en papel, sin pasar por `/[ampa]/alta`. Reutiliza
 * `registerFamily` tal cual (mismo contrato: tutor + alumnos + consentimientos)
 * — la única diferencia con el alta pública es quién la dispara y de dónde sale
 * el `ampaId` (aquí, de la sesión de junta ya autorizada, nunca del cliente).
 *
 * Nota de evidencia RGPD: la IP registrada aquí es la de quien esté usando el
 * panel (junta), no la de la familia — decisión aceptada explícitamente por el
 * usuario para el alta manual (papel/presencial), a la espera del portal de
 * familias para poder invitar directamente por email.
 */
export async function createFamilyAction(input: RegisterFamilyInput): Promise<CreateFamilyActionResult> {
  const { ampaId } = await requireAmpaRole("MANAGE_MEMBERS");

  const parseResult = registerFamilySchema.safeParse(input);
  if (!parseResult.success) {
    return { ok: false, error: parseResult.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const ip = await resolveRequestIp();

  try {
    const result = await registerFamily(ampaId, parseResult.data, { ip });
    await getOrCreateFamilyCardToken(ampaId, result.familyId);
    return { ok: true, referenceCode: result.referenceCode };
  } catch (error) {
    console.error("createFamilyAction failed:", error);
    return { ok: false, error: "No se pudo dar de alta la familia. Inténtalo de nuevo." };
  }
}
