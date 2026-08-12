import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  createAmpa,
  getAmpaDetail,
  updateAmpa,
  listCenters,
  listPlatformAdmins,
  invitePlatformAdmin,
  removePlatformAdmin,
} from "../src/lib/platform-admin";

// Panel de admin ampliado (feedback de usuario, 2026-08-11): "desarrolla
// todas las pantallas necesarias" — antes solo había una tabla de solo
// lectura. Sin aislamiento multi-tenant que probar aquí (es intencionalmente
// transversal, como ya documenta listAmpasOverview), pero sí las reglas de
// negocio propias de cada operación.

describe("platform-admin: gestión (Postgres real)", () => {
  let existingCenterId: string;
  let createdAmpaId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-PLATFORM-MGMT" },
      update: {},
      create: { name: "Test Center Platform Mgmt", code: "TEST-CENTER-PLATFORM-MGMT" },
    });
    existingCenterId = center.id;
  });

  afterAll(async () => {
    await prisma.userAmpaRole.deleteMany({ where: { ampaId: createdAmpaId } });
    await prisma.academicYear.deleteMany({ where: { ampaId: createdAmpaId } });
    await prisma.ampa.deleteMany({ where: { id: createdAmpaId } });
    await prisma.center.deleteMany({
      where: { code: { in: ["TEST-CENTER-PLATFORM-MGMT", "TEST-CENTER-PLATFORM-MGMT-NEW"] } },
    });
    const admin = await prisma.user.findUnique({ where: { email: "nuevo.admin@example.com" } });
    if (admin) await prisma.user.delete({ where: { id: admin.id } });
    await prisma.$disconnect();
  });

  it("listCenters devuelve los centros existentes", async () => {
    const centers = await listCenters();
    expect(centers.some((c) => c.id === existingCenterId)).toBe(true);
  });

  it("createAmpa da de alta la AMPA con un centro existente y su curso académico inicial", async () => {
    const result = await createAmpa({
      name: "AMPA de Prueba Admin",
      subdomain: "test-ampa-admin-mgmt",
      locale: "es",
      centerId: existingCenterId,
      academicYearLabel: "2026-2027",
      academicYearStart: new Date("2026-09-01"),
      academicYearEnd: new Date("2027-06-30"),
    });
    createdAmpaId = result.id;

    const detail = await getAmpaDetail(result.id);
    expect(detail?.name).toBe("AMPA de Prueba Admin");
    expect(detail?.subdomain).toBe("test-ampa-admin-mgmt");
    expect(detail?.academicYears).toHaveLength(1);
    expect(detail?.academicYears[0]?.isActive).toBe(true);
  });

  it("createAmpa crea también el centro nuevo si no se pasa centerId", async () => {
    const result = await createAmpa({
      name: "AMPA Centro Nuevo",
      subdomain: "test-ampa-admin-newcenter",
      locale: "es",
      newCenterName: "Centro Nuevo de Prueba",
      newCenterCode: "TEST-CENTER-PLATFORM-MGMT-NEW",
      academicYearLabel: "2026-2027",
      academicYearStart: new Date("2026-09-01"),
      academicYearEnd: new Date("2027-06-30"),
    });

    const detail = await getAmpaDetail(result.id);
    expect(detail?.centerName).toBe("Centro Nuevo de Prueba");

    await prisma.academicYear.deleteMany({ where: { ampaId: result.id } });
    await prisma.ampa.delete({ where: { id: result.id } });
  });

  it("getAmpaDetail devuelve null para un id inexistente", async () => {
    const detail = await getAmpaDetail("non-existent-id");
    expect(detail).toBeNull();
  });

  it("updateAmpa actualiza nombre, estado activo y datos SEPA", async () => {
    await updateAmpa(createdAmpaId, {
      name: "AMPA Renombrada",
      active: false,
      sepaCreditorId: "ES12ZZZ12345678901234567890",
      sepaCreditorName: "AMPA Renombrada",
      sepaIban: "ES7620770024003102575766",
    });

    const detail = await getAmpaDetail(createdAmpaId);
    expect(detail?.name).toBe("AMPA Renombrada");
    expect(detail?.active).toBe(false);
    expect(detail?.sepaIban).toBe("ES7620770024003102575766");
  });

  it("updateAmpa cambia el curso académico activo (desactiva el resto)", async () => {
    const secondYear = await prisma.academicYear.create({
      data: {
        ampaId: createdAmpaId,
        label: "2027-2028",
        startDate: new Date("2027-09-01"),
        endDate: new Date("2028-06-30"),
        isActive: false,
      },
    });

    await updateAmpa(createdAmpaId, { name: "AMPA Renombrada", active: true, activeAcademicYearId: secondYear.id });

    const detail = await getAmpaDetail(createdAmpaId);
    const active = detail?.academicYears.filter((y) => y.isActive);
    expect(active).toHaveLength(1);
    expect(active?.[0]?.id).toBe(secondYear.id);
  });

  it("updateAmpa falla para un id inexistente", async () => {
    await expect(updateAmpa("non-existent-id", { name: "X", active: true })).rejects.toThrow("AMPA no encontrada");
  });

  it("invitePlatformAdmin da el flag isPlatformAdmin y listPlatformAdmins lo refleja", async () => {
    const result = await invitePlatformAdmin({ name: "Nuevo Admin", email: "nuevo.admin@example.com" });

    const admins = await listPlatformAdmins();
    expect(admins.some((a) => a.userId === result.userId)).toBe(true);

    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    expect(user?.isPlatformAdmin).toBe(true);
  });

  it("removePlatformAdmin quita el flag pero no borra el User", async () => {
    const admin = await prisma.user.findUnique({ where: { email: "nuevo.admin@example.com" } });

    await removePlatformAdmin(admin!.id);

    const admins = await listPlatformAdmins();
    expect(admins.some((a) => a.userId === admin!.id)).toBe(false);

    const user = await prisma.user.findUnique({ where: { id: admin!.id } });
    expect(user).not.toBeNull();
    expect(user?.isPlatformAdmin).toBe(false);
  });

  it("removePlatformAdmin falla si la persona no es superadmin de plataforma", async () => {
    const admin = await prisma.user.findUnique({ where: { email: "nuevo.admin@example.com" } });
    await expect(removePlatformAdmin(admin!.id)).rejects.toThrow("Este usuario no es superadmin de plataforma");
  });
});
