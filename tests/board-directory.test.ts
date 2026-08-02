import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { listFamilies, listFeeSchemas } from "../src/lib/board-directory";

describe("board-directory (listados para el backoffice, contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let academicYearId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-DIRECTORY" },
      update: {},
      create: { name: "Test Center Directory", code: "TEST-CENTER-DIRECTORY" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-directory" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Directory", subdomain: "test-ampa-directory" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-directory-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Directory Other", subdomain: "test-ampa-directory-other" },
    });
    otherAmpaId = otherAmpa.id;

    const academicYear = await prisma.academicYear.upsert({
      where: { ampaId_label: { ampaId, label: "2026-2027" } },
      update: {},
      create: {
        ampaId,
        label: "2026-2027",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-06-30"),
        isActive: true,
      },
    });
    academicYearId = academicYear.id;

    await prisma.feeSchema.create({
      data: { ampaId, academicYearId, name: "Cuota estándar", amount: 100 },
    });

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "DIR-TEST-0001" } });
    await prisma.guardian.create({ data: { familyId: family.id, name: "Tutor Uno", email: "tutor1@example.com" } });
    await prisma.student.create({ data: { familyId: family.id, name: "Alumno Uno" } });
    await prisma.student.create({ data: { familyId: family.id, name: "Alumno Dos" } });

    // Datos de la OTRA AMPA, para verificar que no se filtran en los listados.
    const otherFamily = await prisma.family.create({ data: { ampaId: otherAmpaId, referenceCode: "OTHER-0001" } });
    await prisma.guardian.create({
      data: { familyId: otherFamily.id, name: "Tutor Ajeno", email: "ajeno@example.com" },
    });
  });

  afterAll(async () => {
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.feeSchema.deleteMany({ where: { ampaId } });
    await prisma.academicYear.deleteMany({ where: { ampaId } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-DIRECTORY" } });
    await prisma.$disconnect();
  });

  it("listFamilies devuelve solo las familias de esta AMPA, con tutores y nº de alumnos", async () => {
    const families = await listFamilies(ampaId);

    expect(families).toHaveLength(1);
    expect(families[0]?.referenceCode).toBe("DIR-TEST-0001");
    expect(families[0]?.guardianNames).toEqual(["Tutor Uno"]);
    expect(families[0]?.studentCount).toBe(2);
  });

  it("listFeeSchemas devuelve solo las cuotas de esta AMPA, con el curso ya resuelto", async () => {
    const feeSchemas = await listFeeSchemas(ampaId);

    expect(feeSchemas).toHaveLength(1);
    expect(feeSchemas[0]?.name).toBe("Cuota estándar");
    expect(feeSchemas[0]?.amount).toBe(100);
    expect(feeSchemas[0]?.academicYearLabel).toBe("2026-2027");
  });

  it("no filtra datos de otra AMPA (aislamiento multi-tenant)", async () => {
    const familiesFromOtherAmpa = await listFamilies(otherAmpaId);
    expect(familiesFromOtherAmpa).toHaveLength(1);
    expect(familiesFromOtherAmpa[0]?.referenceCode).toBe("OTHER-0001");

    const feeSchemasFromOtherAmpa = await listFeeSchemas(otherAmpaId);
    expect(feeSchemasFromOtherAmpa).toHaveLength(0);
  });
});
