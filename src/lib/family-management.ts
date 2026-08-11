import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Feedback de usuario (2026-08-11): "ficha de familia" — a diferencia de
// `registerFamily` (que da de alta familia + tutor + alumnos + consentimientos
// TODO junto, para el alta inicial), este módulo cubre operaciones de gestión
// sobre una familia YA EXISTENTE, gestionadas desde el panel de junta.

export const addStudentToFamilySchema = z.object({
  name: z.string().trim().min(1, "El nombre del alumno/a es obligatorio"),
  birthDate: z.coerce.date().optional(),
});

export type AddStudentToFamilyInput = z.infer<typeof addStudentToFamilySchema>;

/**
 * Añade un alumno/a a una familia ya existente. Distinto del alta inicial
 * (`registerFamily`): aquí no se tocan tutores ni consentimientos, solo se crea
 * el nuevo `Student`.
 */
export async function addStudentToFamily(
  ampaId: string,
  familyId: string,
  input: AddStudentToFamilyInput,
): Promise<{ id: string }> {
  const parsed = addStudentToFamilySchema.parse(input);

  return withAmpaScope(ampaId, async (db) => {
    const family = await db.family.findUnique({ where: { id: familyId } });
    if (!family) throw new Error("Familia no encontrada para esta AMPA");

    const student = await db.student.create({
      data: { familyId, name: parsed.name, birthDate: parsed.birthDate },
    });

    return { id: student.id };
  });
}

export const addContactToFamilySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Email no válido"),
  phone: z.string().trim().min(1).optional(),
});

export type AddContactToFamilyInput = z.infer<typeof addContactToFamilySchema>;

/**
 * Añade una persona de contacto a una familia (libro de socios, ver
 * src/lib/members.ts): NO es socio/a de la asociación (`isLegalMember` queda
 * en `false` por defecto) — por eso no exige DNI ni dirección, a diferencia
 * del tutor legal que se registra en `registerFamily`.
 */
export async function addContactToFamily(
  ampaId: string,
  familyId: string,
  input: AddContactToFamilyInput,
): Promise<{ id: string }> {
  const parsed = addContactToFamilySchema.parse(input);

  return withAmpaScope(ampaId, async (db) => {
    const family = await db.family.findUnique({ where: { id: familyId } });
    if (!family) throw new Error("Familia no encontrada para esta AMPA");

    const guardian = await db.guardian.create({
      data: { familyId, name: parsed.name, email: parsed.email, phone: parsed.phone },
    });

    return { id: guardian.id };
  });
}
