import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { listAmpasOverview } from "../src/lib/platform-admin";

describe("listAmpasOverview (lectura transversal, Postgres real)", () => {
  let ampaAId: string;
  let ampaBId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-PLATFORM-OVERVIEW" },
      update: {},
      create: { name: "Test Center Platform Overview", code: "TEST-CENTER-PLATFORM-OVERVIEW" },
    });

    const ampaA = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-overview-a" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Overview A", subdomain: "test-ampa-overview-a" },
    });
    ampaAId = ampaA.id;

    const ampaB = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-overview-b" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Overview B", subdomain: "test-ampa-overview-b" },
    });
    ampaBId = ampaB.id;

    const academicYear = await prisma.academicYear.upsert({
      where: { ampaId_label: { ampaId: ampaAId, label: "2026-2027" } },
      update: { isActive: true },
      create: {
        ampaId: ampaAId,
        label: "2026-2027",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-06-30"),
        isActive: true,
      },
    });
    void academicYear;

    const familyA1 = await prisma.family.create({ data: { ampaId: ampaAId, referenceCode: "OVERVIEW-A-0001" } });
    await prisma.family.create({ data: { ampaId: ampaAId, referenceCode: "OVERVIEW-A-0002" } });
    await prisma.charge.create({
      data: {
        ampaId: ampaAId,
        familyId: familyA1.id,
        concept: "Cuota",
        amount: 30,
        dueDate: new Date(),
        status: "PENDING",
      },
    });
    await prisma.charge.create({
      data: {
        ampaId: ampaAId,
        familyId: familyA1.id,
        concept: "Cuota pagada",
        amount: 999,
        dueDate: new Date(),
        status: "PAID",
      },
    });
  });

  afterAll(async () => {
    await prisma.charge.deleteMany({ where: { ampaId: { in: [ampaAId, ampaBId] } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaAId, ampaBId] } } });
    await prisma.academicYear.deleteMany({ where: { ampaId: ampaAId } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaAId, ampaBId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-PLATFORM-OVERVIEW" } });
    await prisma.$disconnect();
  });

  it("incluye a TODAS las AMPAs (no filtra por tenant, es transversal a propósito)", async () => {
    const overview = await listAmpasOverview();
    const subdomains = overview.map((a) => a.subdomain);
    expect(subdomains).toContain("test-ampa-overview-a");
    expect(subdomains).toContain("test-ampa-overview-b");
  });

  it("calcula familyCount, cargos pendientes (no los pagados) y el curso activo por AMPA", async () => {
    const overview = await listAmpasOverview();
    const ampaA = overview.find((a) => a.id === ampaAId);

    expect(ampaA?.familyCount).toBe(2);
    expect(ampaA?.pendingChargesCount).toBe(1);
    expect(ampaA?.pendingChargesTotal).toBe(30);
    expect(ampaA?.activeAcademicYearLabel).toBe("2026-2027");
  });

  it("una AMPA sin curso activo/familias devuelve valores en cero, no un error", async () => {
    const overview = await listAmpasOverview();
    const ampaB = overview.find((a) => a.id === ampaBId);

    expect(ampaB?.familyCount).toBe(0);
    expect(ampaB?.pendingChargesCount).toBe(0);
    expect(ampaB?.activeAcademicYearLabel).toBeNull();
  });
});
