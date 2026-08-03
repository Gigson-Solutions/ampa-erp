"use server";

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registerFamily, registerFamilySchema, type RegisterFamilyInput } from "@/lib/family-registration";
import { getOrCreateFamilyCardToken } from "@/lib/card";

export interface RegisterFamilyActionResult {
  ok: boolean;
  error?: string;
  referenceCode?: string;
  cardToken?: string;
}

async function resolveRequestIp(): Promise<string> {
  const headerList = await headers();
  // `x-forwarded-for` puede traer una lista de IPs (cliente, proxies...) — la
  // primera es la del cliente original. Coolify/Traefik la añaden automáticamente.
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Server Action que expone `registerFamily` a la ruta pública `[ampa]`. El
 * `ampaSubdomain` viene del segmento de URL (fallback local sin subdominios reales
 * — ver proxy.ts), nunca del cliente de forma "de confianza": aquí se resuelve el
 * `ampaId` real consultando `Ampa.subdomain` antes de llamar a `withAmpaScope`.
 */
export async function registerFamilyAction(
  ampaSubdomain: string,
  input: RegisterFamilyInput,
): Promise<RegisterFamilyActionResult> {
  const ampa = await prisma.ampa.findUnique({ where: { subdomain: ampaSubdomain } });
  if (!ampa) notFound();

  const parseResult = registerFamilySchema.safeParse(input);
  if (!parseResult.success) {
    return { ok: false, error: parseResult.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const ip = await resolveRequestIp();

  try {
    const result = await registerFamily(ampa.id, parseResult.data, { ip });
    // El carnet digital se genera ya en el alta para poder enseñar el enlace en
    // la propia pantalla de éxito — evita un paso adicional de "generar carnet".
    const cardToken = await getOrCreateFamilyCardToken(ampa.id, result.familyId);
    return { ok: true, referenceCode: result.referenceCode, cardToken };
  } catch (error) {
    console.error("registerFamilyAction failed:", error);
    return { ok: false, error: "No se pudo completar el alta. Inténtalo de nuevo." };
  }
}
