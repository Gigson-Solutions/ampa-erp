import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { addStudentToFamily } from "../src/lib/family-management";
import { getFamilyDetail } from "../src/lib/board-directory";

// Ficha de familia (feedback de usuario, 2026-08-11): `addStudentToFamily`
// añade un alumno/a a una familia YA EXISTENTE (distinto de `registerFamily`,
// que da de alta todo junto). `getFamilyDetail` es lo que alimenta esa misma
// ficha — se testean juntos porque comparten el mismo escenario.

describe("family-management (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let familyId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-FAMMGMT" },
      update: {},
      create: { name: "Test Center FamMgmt", code: "TEST-CENTER-FAMMGMT" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-fammgmt" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA FamMgmt", subdomain: "test-ampa-fammgmt" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-fammgmt-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA FamMgmt Other", subdomain: "test-ampa-fammgmt-other" },
    });
    otherAmpaId = otherAmpa.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "FAMMGMT-0001" } });
    familyId = family.id;
    await prisma.guardian.create({
      data: {
        familyId,
        name: "Tutor Legal Uno",
        email: "tutor@example.com",
        dni: "11111111A",
        address: "Calle Test 1",
        isLegalMember: true,
        memberJoinedAt: new Date("2026-08-01"),
      },
    });
    await prisma.student.create({ data: { familyId, name: "Alumno Existente" } });
  });

  afterAll(async () => {
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-FAMMGMT" } });
    await prisma.$disconnect();
  });

  it("añade un alumno/a a una familia existente", async () => {
    const result = await addStudentToFamily(ampaId, familyId, {
      name: "Alumno Nuevo",
      birthDate: new Date("2015-05-20"),
    });

    expect(result.id).toBeTruthy();

    const students = await prisma.student.findMany({ where: { familyId } });
    expect(students).toHaveLength(2);
    expect(students.map((s) => s.name)).toContain("Alumno Nuevo");
  });

  it("falla si la familia no existe para esta AMPA (aislamiento multi-tenant)", async () => {
    await expect(addStudentToFamily(otherAmpaId, familyId, { name: "Intruso" })).rejects.toThrow(
      "Familia no encontrada para esta AMPA",
    );
  });

  it("getFamilyDetail devuelve tutores (con isLegalMember) y alumnos", async () => {
    const detail = await getFamilyDetail(ampaId, familyId);

    expect(detail).not.toBeNull();
    expect(detail?.referenceCode).toBe("FAMMGMT-0001");
    expect(detail?.guardians).toHaveLength(1);
    expect(detail?.guardians[0]?.isLegalMember).toBe(true);
    expect(detail?.students.length).toBeGreaterThanOrEqual(1);
  });

  it("getFamilyDetail devuelve null si la familia pertenece a otra AMPA", async () => {
    const detail = await getFamilyDetail(otherAmpaId, familyId);
    expect(detail).toBeNull();
  });
});
