import { randomUUID } from "node:crypto";
import { z } from "zod";
import { withAmpaScope } from "./tenant";
import { buildConsentEvidence } from "./consent";

// Fase 1 (ver roadmap en CLAUDE.md): "alta online con consentimientos RGPD
// versionados". Este módulo es la única puerta de entrada para dar de alta una
// familia — toda la lógica de negocio (validación, generación de código de
// referencia, registro de consentimientos) vive aquí, no en el Server Action, para
// que sea unit/integration-testable sin pasar por Next.js.

export const registerFamilySchema = z.object({
  guardian: z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    email: z.string().trim().email("Email no válido"),
    phone: z.string().trim().min(1).optional(),
    // El tutor que da de alta la familia es, por defecto, el socio/a de la
    // asociación (libro de socios, LO 1/2002) — DNI/NIE y dirección son los
    // datos mínimos que exige el registro formal de un socio.
    dni: z.string().trim().min(1, "El DNI/NIE es obligatorio"),
    address: z.string().trim().min(1, "La dirección es obligatoria"),
  }),
  students: z
    .array(
      z.object({
        name: z.string().trim().min(1, "El nombre del alumno/a es obligatorio"),
        birthDate: z.coerce.date().optional(),
      }),
    )
    .min(1, "Debe indicarse al menos un alumno/a"),
  consents: z.object({
    // El consentimiento de datos básicos es obligatorio para poder gestionar la
    // membresía (base legal: ejecución de la relación asociativa) — no es opcional
    // aunque el modelo `Consent` permita `accepted: false` para dejar constancia de
    // un rechazo (p.ej. imagen/cesión al centro).
    data: z.literal(true, { message: "El consentimiento de datos básicos es obligatorio" }),
    image: z.boolean(),
    centerShare: z.boolean(),
  }),
});

export type RegisterFamilyInput = z.infer<typeof registerFamilySchema>;

export interface RegisterFamilyContext {
  ip: string;
  now?: Date;
}

export interface RegisterFamilyResult {
  familyId: string;
  referenceCode: string;
}

function generateReferenceCode(): string {
  return `F-${randomUUID().slice(0, 8).toUpperCase()}`;
}

/**
 * Alta de familia + tutor + alumnos + consentimientos RGPD, todo en una única
 * transacción con scope de tenant (`withAmpaScope`). Si algo falla a mitad, no
 * queda una familia "a medias" sin consentimientos registrados.
 */
export async function registerFamily(
  ampaId: string,
  input: RegisterFamilyInput,
  context: RegisterFamilyContext,
): Promise<RegisterFamilyResult> {
  const parsed = registerFamilySchema.parse(input);
  const now = context.now ?? new Date();
  const referenceCode = generateReferenceCode();

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const family = await db.family.create({
      data: { ampaId: scopedAmpaId, referenceCode },
    });

    await db.guardian.create({
      data: {
        familyId: family.id,
        name: parsed.guardian.name,
        email: parsed.guardian.email,
        phone: parsed.guardian.phone,
        dni: parsed.guardian.dni,
        address: parsed.guardian.address,
        // El tutor que registra la familia queda como socio/a (libro de
        // socios) desde el mismo momento del alta — no es un paso aparte.
        isLegalMember: true,
        memberJoinedAt: now,
      },
    });

    for (const student of parsed.students) {
      await db.student.create({
        data: {
          familyId: family.id,
          name: student.name,
          birthDate: student.birthDate,
        },
      });
    }

    const consentEntries: Array<[keyof RegisterFamilyInput["consents"], boolean]> = [
      ["data", parsed.consents.data],
      ["image", parsed.consents.image],
      ["centerShare", parsed.consents.centerShare],
    ];
    const consentTypeByKey = {
      data: "DATA",
      image: "IMAGE",
      centerShare: "CENTER_SHARE",
    } as const;

    for (const [key, accepted] of consentEntries) {
      const evidence = buildConsentEvidence({
        type: consentTypeByKey[key],
        accepted,
        ip: context.ip,
        timestamp: now,
      });

      await db.consent.create({
        data: {
          familyId: family.id,
          type: evidence.type,
          version: evidence.version,
          accepted: evidence.accepted,
          ip: evidence.ip,
          hash: evidence.hash,
          acceptedAt: evidence.acceptedAt,
        },
      });
    }

    return { familyId: family.id, referenceCode };
  });
}
