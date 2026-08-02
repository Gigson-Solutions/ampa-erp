import { z } from "zod";
import { withAmpaScope } from "./tenant";
import { calculateDiscountedFee, calculateProratedFee } from "./fees";

// Fase 1 (ver roadmap): "cuotas por familia... con descuentos (hermanos, familia
// numerosa, beca)". A diferencia del alta de familia (autoservicio público), crear
// una membresía es una acción de la junta (tesorería/secretaría) — por eso los
// datos de descuento (hermanos, familia numerosa, beca) se pasan explícitos en vez
// de derivarse automáticamente de lo que la familia declaró en el alta: requieren
// verificación humana (certificado de familia numerosa, aprobación de beca...), no
// son autodeclarables sin control.

export const createMembershipSchema = z.object({
  familyId: z.string().min(1),
  // `academicYearId` NO se pide aquí a propósito: `FeeSchema.academicYearId` ya lo
  // fija de forma inequívoca, y pedirlo por separado abría la puerta a que alguien
  // enviara una combinación inconsistente (una cuota de un curso con el
  // academicYearId de otro). Se deriva siempre del FeeSchema elegido.
  feeSchemaId: z.string().min(1),
  enrollmentDate: z.coerce.date().optional(),
  familyDiscounts: z
    .object({
      siblingCount: z.number().int().min(0).default(0),
      isLargeFamily: z.boolean().default(false),
      scholarshipDiscountPercent: z.number().min(0).max(100).default(0),
    })
    .default({ siblingCount: 0, isLargeFamily: false, scholarshipDiscountPercent: 0 }),
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;

export interface CreateMembershipResult {
  membershipId: string;
  chargeId: string;
  amount: number;
}

interface FeeSchemaDiscountConfig {
  siblingDiscountPercent?: number;
  largeFamilyDiscountPercent?: number;
}

function isFeeSchemaDiscountConfig(value: unknown): value is FeeSchemaDiscountConfig {
  return typeof value === "object" && value !== null;
}

const CHARGE_DUE_DAYS = 30;

/**
 * Crea la membresía de una familia para un curso, calculando la cuota final
 * (prorrateo por fecha de alta + descuentos) con las funciones ya testeadas de
 * `fees.ts`, y genera el cargo (`Charge`) pendiente de cobro correspondiente.
 */
export async function createMembershipWithCharge(
  ampaId: string,
  input: CreateMembershipInput,
): Promise<CreateMembershipResult> {
  const parsed = createMembershipSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const feeSchema = await db.feeSchema.findUnique({ where: { id: parsed.feeSchemaId } });
    if (!feeSchema) throw new Error("FeeSchema no encontrado para esta AMPA");

    const academicYear = await db.academicYear.findUnique({ where: { id: feeSchema.academicYearId } });
    if (!academicYear) throw new Error("AcademicYear no encontrado para esta AMPA");

    const enrollmentDate = parsed.enrollmentDate ?? new Date();
    const discountConfig = isFeeSchemaDiscountConfig(feeSchema.discountRules) ? feeSchema.discountRules : {};

    const proratedAmount = calculateProratedFee({
      fullYearAmount: feeSchema.amount.toNumber(),
      academicYearStart: academicYear.startDate,
      academicYearEnd: academicYear.endDate,
      enrollmentDate,
    });

    const finalAmount = calculateDiscountedFee(proratedAmount, {
      siblingCount: parsed.familyDiscounts.siblingCount,
      siblingDiscountPercent: discountConfig.siblingDiscountPercent,
      isLargeFamily: parsed.familyDiscounts.isLargeFamily,
      largeFamilyDiscountPercent: discountConfig.largeFamilyDiscountPercent,
      scholarshipDiscountPercent: parsed.familyDiscounts.scholarshipDiscountPercent,
    });

    const membership = await db.membership.create({
      data: {
        ampaId: scopedAmpaId,
        familyId: parsed.familyId,
        academicYearId: feeSchema.academicYearId,
        feeSchemaId: parsed.feeSchemaId,
        status: "ACTIVE",
      },
    });

    const dueDate = new Date(enrollmentDate);
    dueDate.setDate(dueDate.getDate() + CHARGE_DUE_DAYS);

    const charge = await db.charge.create({
      data: {
        ampaId: scopedAmpaId,
        familyId: parsed.familyId,
        concept: `Cuota ${academicYear.label}`,
        amount: finalAmount,
        dueDate,
        status: "PENDING",
      },
    });

    return { membershipId: membership.id, chargeId: charge.id, amount: finalAmount };
  });
}
