import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma";
import { requirePlatformAdmin } from "../src/lib/require-platform-admin";

// Mismo criterio que require-ampa-session.test.ts: se mockea `src/lib/auth` (para
// fijar el estado de sesión) pero NO `next/navigation`, así que los
// `redirect()`/`notFound()` reales de Next.js se disparan y se verifica el digest
// real.

const mockAuth = vi.fn();
vi.mock("../src/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("requirePlatformAdmin (autorización de /admin, con sesión simulada)", () => {
  let platformAdminUserId: string;
  let boardSuperadminUserId: string; // SUPERADMIN de UNA AMPA vía UserAmpaRole — NO debe colar aquí
  let regularUserId: string;

  beforeAll(async () => {
    const platformAdmin = await prisma.user.upsert({
      where: { email: "platform-admin@example.com" },
      update: { isPlatformAdmin: true },
      create: { email: "platform-admin@example.com", isPlatformAdmin: true },
    });
    platformAdminUserId = platformAdmin.id;

    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-PLATFORM-ADMIN" },
      update: {},
      create: { name: "Test Center Platform Admin", code: "TEST-CENTER-PLATFORM-ADMIN" },
    });
    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-platform-admin" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Platform Admin", subdomain: "test-ampa-platform-admin" },
    });

    const boardSuperadmin = await prisma.user.upsert({
      where: { email: "board-superadmin@example.com" },
      update: {},
      create: { email: "board-superadmin@example.com" },
    });
    boardSuperadminUserId = boardSuperadmin.id;
    await prisma.userAmpaRole.upsert({
      where: { userId_ampaId_role: { userId: boardSuperadminUserId, ampaId: ampa.id, role: "SUPERADMIN" } },
      update: {},
      create: { userId: boardSuperadminUserId, ampaId: ampa.id, role: "SUPERADMIN" },
    });

    const regularUser = await prisma.user.upsert({
      where: { email: "regular-user@example.com" },
      update: {},
      create: { email: "regular-user@example.com" },
    });
    regularUserId = regularUser.id;
  });

  afterEach(() => {
    mockAuth.mockReset();
  });

  afterAll(async () => {
    await prisma.userAmpaRole.deleteMany({ where: { userId: boardSuperadminUserId } });
    await prisma.ampa.deleteMany({ where: { subdomain: "test-ampa-platform-admin" } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-PLATFORM-ADMIN" } });
    await prisma.user.deleteMany({
      where: { id: { in: [platformAdminUserId, boardSuperadminUserId, regularUserId] } },
    });
    await prisma.$disconnect();
  });

  it("redirige a /login si no hay sesión", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });

  it("bloquea (404) a un usuario autenticado normal sin isPlatformAdmin", async () => {
    mockAuth.mockResolvedValue({ user: { id: regularUserId } });
    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("bloquea (404) a un SUPERADMIN de UNA AMPA (UserAmpaRole) — no es lo mismo que isPlatformAdmin", async () => {
    mockAuth.mockResolvedValue({ user: { id: boardSuperadminUserId } });
    await expect(requirePlatformAdmin()).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("deja pasar a un usuario con isPlatformAdmin = true", async () => {
    mockAuth.mockResolvedValue({ user: { id: platformAdminUserId } });
    const context = await requirePlatformAdmin();
    expect(context.userId).toBe(platformAdminUserId);
  });
});
