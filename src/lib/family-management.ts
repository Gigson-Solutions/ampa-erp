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
