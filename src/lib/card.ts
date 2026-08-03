import { randomUUID } from "node:crypto";
import { withAmpaScope } from "./tenant";

// Fase 1 (ver roadmap): "carnet digital con QR". El carnet se identifica por un
// token opaco (`Family.cardToken`), no por el `id` interno de la familia — así la
// URL pública de verificación (`/[ampa]/carnet/[token]`) no es enumerable ni
// filtra IDs internos. El QR simplemente codifica esa misma URL: quien lo escanea
// (un monitor, en la entrada de un evento...) llega a la misma página que la
// familia ya ve en su móvil, sin necesidad de sesión.

export interface FamilyCard {
  ampaName: string;
  referenceCode: string;
  membershipStatus: "ACTIVE" | "PENDING" | "CANCELLED" | "NONE";
  academicYearLabel: string | null;
}

/**
 * Devuelve el token de carnet de una familia, generándolo si todavía no tiene uno
 * (familias creadas antes de esta pieza, o cuyo token nunca se pidió). Idempotente.
 */
export async function getOrCreateFamilyCardToken(ampaId: string, familyId: string): Promise<string> {
  return withAmpaScope(ampaId, async (db) => {
    const family = await db.family.findUnique({ where: { id: familyId } });
    if (!family) throw new Error("Familia no encontrada para esta AMPA");
    if (family.cardToken) return family.cardToken;

    const token = randomUUID();
    await db.family.update({ where: { id: family.id }, data: { cardToken: token } });
    return token;
  });
}

/**
 * Resuelve el carnet a partir del token público. Devuelve `null` si el token no
 * existe o pertenece a otra AMPA (el `where` con `cardToken` ya lleva `ampaId`
 * inyectado por la capa 2, así que un token de otra AMPA simplemente no matchea).
 */
export async function getFamilyCardByToken(ampaId: string, token: string): Promise<FamilyCard | null> {
  return withAmpaScope(ampaId, async (db) => {
    const family = await db.family.findUnique({
      where: { cardToken: token },
      include: {
        ampa: true,
        memberships: {
          include: { academicYear: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    if (!family) return null;

    const latestMembership = family.memberships[0];

    return {
      ampaName: family.ampa.name,
      referenceCode: family.referenceCode,
      membershipStatus: (latestMembership?.status as FamilyCard["membershipStatus"]) ?? "NONE",
      academicYearLabel: latestMembership?.academicYear.label ?? null,
    };
  });
}
