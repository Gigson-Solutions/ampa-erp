import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 2 (ver roadmap): "libro de socios" (LO 1/2002) — registro de asociados
// con alta y baja. Un socio/a = una persona por familia (el "tutor legal",
// `Guardian.isLegalMember`), no la familia en sí. Sin tabla nueva: se
// reutiliza `Guardian`, que ya lleva los campos legales desde la ficha de
// familia (dni, address, isLegalMember, memberJoinedAt, memberLeftAt).
//
// Deliberadamente NO hay `deleteMember` — LO 1/2002 exige trazabilidad de
// altas y bajas, así que un socio/a que se da de baja se marca (`memberLeftAt`),
// nunca se borra la fila.

export interface MemberSummary {
  guardianId: string;
  name: string;
  email: string;
  phone: string | null;
  dni: string | null;
  address: string | null;
  familyId: string;
  familyReferenceCode: string;
  joinedAt: Date | null;
  leftAt: Date | null;
  active: boolean;
}

/**
 * Listado del libro de socios: todos los `Guardian` marcados como
 * `isLegalMember`, con alta y baja (si la hay). Incluye tanto socios activos
 * como de baja, para que el libro sea un histórico completo, no solo "quién
 * es socio hoy".
 */
export async function listMembers(ampaId: string): Promise<MemberSummary[]> {
  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    // `Guardian` no lleva `ampaId` propio (no está en `TENANT_SCOPED_MODELS`,
    // se aísla transitivamente vía `Family`) — la extensión de la capa 2 no
    // toca esta query, así que el filtro por AMPA hay que ponerlo a mano.
    const guardians = await db.guardian.findMany({
      where: { isLegalMember: true, family: { ampaId: scopedAmpaId } },
      include: { family: true },
      orderBy: { memberJoinedAt: "asc" },
    });

    return guardians.map((guardian) => ({
      guardianId: guardian.id,
      name: guardian.name,
      email: guardian.email,
      phone: guardian.phone,
      dni: guardian.dni,
      address: guardian.address,
      familyId: guardian.familyId,
      familyReferenceCode: guardian.family.referenceCode,
      joinedAt: guardian.memberJoinedAt,
      leftAt: guardian.memberLeftAt,
      active: guardian.memberLeftAt === null,
    }));
  });
}

export const endMembershipSchema = z.object({ guardianId: z.string().min(1) });

/**
 * Da de baja a un socio/a (fija `memberLeftAt`). No borra la fila del
 * `Guardian` — sigue existiendo como persona de contacto de la familia, solo
 * deja de figurar como socio/a activo en el libro.
 */
export async function endMembership(ampaId: string, input: { guardianId: string }): Promise<void> {
  const parsed = endMembershipSchema.parse(input);

  await withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const guardian = await db.guardian.findUnique({
      where: { id: parsed.guardianId },
      include: { family: true },
    });
    // `guardian.family` puede llegar `null` en tiempo de ejecución (aunque el
    // tipo generado por Prisma lo marque como obligatorio) cuando el
    // `Guardian` pertenece a otra AMPA — el `include` sobre `Family` (que sí
    // está en TENANT_SCOPED_MODELS) queda filtrado por la capa 2. Comprobación
    // explícita en vez de asumir que siempre viene poblado.
    if (!guardian || !guardian.family || guardian.family.ampaId !== scopedAmpaId) {
      throw new Error("Socio/a no encontrado/a para esta AMPA");
    }
    if (!guardian.isLegalMember) {
      throw new Error("Esta persona no es socio/a — no se puede dar de baja del libro de socios");
    }
    if (guardian.memberLeftAt) {
      throw new Error("Este/a socio/a ya está de baja");
    }

    await db.guardian.update({ where: { id: guardian.id }, data: { memberLeftAt: new Date() } });
  });
}
