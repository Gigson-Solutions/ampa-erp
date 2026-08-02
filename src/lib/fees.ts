// Cálculo de cuota — módulo aislado y unit-testable, sin dependencia de Prisma, tal
// como pide la sección "Ficheros clave" del plan de visión. Fase 0: solo la forma de
// las reglas de descuento más comunes; el resto (beca completa condicionada,
// prorrateo por día exacto, etc.) se amplía en Fase 1 con casos reales de AMPAs.

export interface DiscountRules {
  /** Nº de hermanos en la misma AMPA, sin contar al alumno actual. */
  siblingCount?: number;
  /** % de descuento por hermano adicional (p.ej. 10 = 10%). */
  siblingDiscountPercent?: number;
  /** Familia numerosa (categoría general u honor). */
  isLargeFamily?: boolean;
  largeFamilyDiscountPercent?: number;
  /** Beca — descuento 0-100%. */
  scholarshipDiscountPercent?: number;
}

export interface ProratedFeeInput {
  /** Cuota anual completa. */
  fullYearAmount: number;
  academicYearStart: Date;
  academicYearEnd: Date;
  /** Fecha de alta de la familia, si es a mitad de curso. */
  enrollmentDate: Date;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Aplica las reglas de descuento en orden: hermanos → familia numerosa → beca. Los
 * porcentajes se aplican de forma secuencial sobre el importe restante (no se suman
 * lineales) para no producir descuentos superiores al 100%.
 */
export function calculateDiscountedFee(baseAmount: number, rules: DiscountRules): number {
  let amount = baseAmount;

  if (rules.siblingCount && rules.siblingDiscountPercent) {
    const percent = clampPercent(rules.siblingCount * rules.siblingDiscountPercent);
    amount *= 1 - percent / 100;
  }

  if (rules.isLargeFamily && rules.largeFamilyDiscountPercent) {
    amount *= 1 - clampPercent(rules.largeFamilyDiscountPercent) / 100;
  }

  if (rules.scholarshipDiscountPercent) {
    amount *= 1 - clampPercent(rules.scholarshipDiscountPercent) / 100;
  }

  return Math.round(amount * 100) / 100;
}

/**
 * Prorratea la cuota anual por los días restantes de curso desde la fecha de alta.
 * Alta anterior al inicio de curso o posterior al fin de curso se recorta a los
 * límites del curso.
 */
export function calculateProratedFee(input: ProratedFeeInput): number {
  const { fullYearAmount, academicYearStart, academicYearEnd, enrollmentDate } = input;

  const totalDays = Math.max(
    1,
    Math.round((academicYearEnd.getTime() - academicYearStart.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const effectiveStart =
    enrollmentDate < academicYearStart
      ? academicYearStart
      : enrollmentDate > academicYearEnd
        ? academicYearEnd
        : enrollmentDate;

  const remainingDays = Math.max(
    0,
    Math.round((academicYearEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return Math.round(fullYearAmount * (remainingDays / totalDays) * 100) / 100;
}
