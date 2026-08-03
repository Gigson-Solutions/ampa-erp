import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { exportAmpaData } from "../src/lib/export";

describe("exportAmpaData (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-EXPORT" },
      update: {},
      create: { name: "Test Center Export", code: "TEST-CENTER-EXPORT" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-export" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Export", subdomain: "test-ampa-export", locale: "ca" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-export-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Export Other", subdomain: "test-ampa-export-other" },
    });
    otherAmpaId = otherAmpa.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "EXPORT-TEST-0001" } });
    await prisma.guardian.create({ data: { familyId: family.id, name: "Tutor Export", email: "export@example.com" } });
    await prisma.student.create({ data: { familyId: family.id, name: "Alumno Export" } });
    await prisma.announcement.create({ data: { ampaId, title: "Aviso export", body: "...", sentAt: new Date() } });
    await prisma.document.create({ data: { ampaId, title: "Doc export", url: "https://example.com/doc.pdf" } });

    const otherFamily = await prisma.family.create({ data: { ampaId: otherAmpaId, referenceCode: "EXPORT-OTHER-0001" } });
    void otherFamily;
  });

  afterAll(async () => {
    await prisma.document.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.announcement.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-EXPORT" } });
    await prisma.$disconnect();
  });

  it("incluye los datos de la AMPA, con familias/tutores/alumnos anidados", async () => {
    const data = await exportAmpaData(ampaId);

    expect(data.ampa.subdomain).toBe("test-ampa-export");
    expect(data.ampa.locale).toBe("ca");

    const families = data.families as Array<{
      referenceCode: string;
      guardians: Array<{ name: string }>;
      students: Array<{ name: string }>;
    }>;
    expect(families).toHaveLength(1);
    expect(families[0]?.referenceCode).toBe("EXPORT-TEST-0001");
    expect(families[0]?.guardians[0]?.name).toBe("Tutor Export");
    expect(families[0]?.students[0]?.name).toBe("Alumno Export");

    const announcements = data.announcements as Array<{ title: string }>;
    expect(announcements.some((a) => a.title === "Aviso export")).toBe(true);

    const documents = data.documents as Array<{ title: string }>;
    expect(documents.some((d) => d.title === "Doc export")).toBe(true);
  });

  it("es serializable a JSON sin errores (incluye campos Decimal)", () => {
    return exportAmpaData(ampaId).then((data) => {
      expect(() => JSON.stringify(data)).not.toThrow();
    });
  });

  it("no incluye datos de otra AMPA (aislamiento multi-tenant)", async () => {
    const data = await exportAmpaData(ampaId);
    const families = data.families as Array<{ referenceCode: string }>;
    expect(families.some((f) => f.referenceCode === "EXPORT-OTHER-0001")).toBe(false);
  });

  it("falla si el ampaId no existe", async () => {
    await expect(exportAmpaData("non-existent-id")).rejects.toThrow();
  });
});
