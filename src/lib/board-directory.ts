import { withAmpaScope } from "./tenant";

// Listados de solo lectura para el backoffice de junta — alimentan tanto tablas
// (families/page.tsx) como los selectores del formulario de alta de membresía
// (memberships/page.tsx), que hasta ahora pedían IDs en texto plano.

export interface FamilySummary {
  id: string;
  referenceCode: string;
  guardianNames: string[];
  studentCount: number;
  createdAt: Date;
}

export async function listFamilies(ampaId: string): Promise<FamilySummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const families = await db.family.findMany({
      include: { guardians: true, students: true },
      orderBy: { createdAt: "desc" },
    });

    return families.map((family) => ({
      id: family.id,
      referenceCode: family.referenceCode,
      guardianNames: family.guardians.map((guardian) => guardian.name),
      studentCount: family.students.length,
      createdAt: family.createdAt,
    }));
  });
}

export interface FeeSchemaSummary {
  id: string;
  name: string;
  amount: number;
  academicYearId: string;
  academicYearLabel: string;
}

export async function listFeeSchemas(ampaId: string): Promise<FeeSchemaSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const feeSchemas = await db.feeSchema.findMany({
      include: { academicYear: true },
      orderBy: { createdAt: "desc" },
    });

    return feeSchemas.map((feeSchema) => ({
      id: feeSchema.id,
      name: feeSchema.name,
      amount: feeSchema.amount.toNumber(),
      academicYearId: feeSchema.academicYearId,
      academicYearLabel: feeSchema.academicYear.label,
    }));
  });
}
