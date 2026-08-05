import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma";
import { requireAmpaRole } from "../src/lib/require-ampa-session";

// Pendiente señalado explícitamente tras la pieza anterior (ver plan de visión /
// memoria de proyecto): `requireAmpaRole` nunca se había probado con una sesión de
// verdad — solo la lógica de negocio que protege. Este test cierra ese hueco.
//
// No se monta un servidor Next.js real ni se simula el flujo completo de magic
// link (eso vive en la librería de NextAuth, ya probada por ellos) — lo que SÍ es
// código nuestro y necesita test es la DECISIÓN de autorización: dado un header de
// subdominio y un estado de sesión, ¿deja pasar a quien no debería, o bloquea a
// quien sí debería poder entrar? Por eso se mockean `next/headers` (para fijar el
// subdominio) y `src/lib/auth` (para fijar el estado de sesión), pero NO
// `next/navigation` — así los `redirect()`/`notFound()` reales se disparan y se
// verifica el "digest" real que produce Next.js.

const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

const mockAuth = vi.fn();
vi.mock("../src/lib/auth", () => ({
  auth: () => mockAuth(),
}));

function headerStore(ampaSubdomain: string | null): { get: (key: string) => string | null } {
  return { get: (key: string) => (key === "x-ampa-subdomain" ? ampaSubdomain : null) };
}

describe("requireAmpaRole (autorización de (board), con sesión simulada)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let presidenciaUserId: string;
  let familiaUserId: string;
  let noRoleUserId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-AUTHZ" },
      update: {},
      create: { name: "Test Center Authz", code: "TEST-CENTER-AUTHZ" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-authz" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Authz", subdomain: "test-ampa-authz" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-authz-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Authz Other", subdomain: "test-ampa-authz-other" },
    });
    otherAmpaId = otherAmpa.id;

    const presidenciaUser = await prisma.user.upsert({
      where: { email: "test-presidencia@example.com" },
      update: {},
      create: { email: "test-presidencia@example.com" },
    });
    presidenciaUserId = presidenciaUser.id;
    await prisma.userAmpaRole.upsert({
      where: { userId_ampaId_role: { userId: presidenciaUserId, ampaId, role: "PRESIDENCIA" } },
      update: {},
      create: { userId: presidenciaUserId, ampaId, role: "PRESIDENCIA" },
    });

    const familiaUser = await prisma.user.upsert({
      where: { email: "test-familia@example.com" },
      update: {},
      create: { email: "test-familia@example.com" },
    });
    familiaUserId = familiaUser.id;
    await prisma.userAmpaRole.upsert({
      where: { userId_ampaId_role: { userId: familiaUserId, ampaId, role: "FAMILIA" } },
      update: {},
      create: { userId: familiaUserId, ampaId, role: "FAMILIA" },
    });

    // Presidente de la OTRA AMPA — para probar que un rol en la AMPA B no da
    // ningún permiso en la AMPA A.
    const noRoleUser = await prisma.user.upsert({
      where: { email: "test-presidencia-other@example.com" },
      update: {},
      create: { email: "test-presidencia-other@example.com" },
    });
    noRoleUserId = noRoleUser.id;
    await prisma.userAmpaRole.upsert({
      where: { userId_ampaId_role: { userId: noRoleUserId, ampaId: otherAmpaId, role: "PRESIDENCIA" } },
      update: {},
      create: { userId: noRoleUserId, ampaId: otherAmpaId, role: "PRESIDENCIA" },
    });
  });

  afterEach(() => {
    mockHeaders.mockReset();
    mockAuth.mockReset();
  });

  afterAll(async () => {
    await prisma.userAmpaRole.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-AUTHZ" } });
    await prisma.user.deleteMany({
      where: { id: { in: [presidenciaUserId, familiaUserId, noRoleUserId] } },
    });
    await prisma.$disconnect();
  });

  it("bloquea (404) si no hay header de subdominio (proxy.ts no lo puso)", async () => {
    mockHeaders.mockResolvedValue(headerStore(null));
    mockAuth.mockResolvedValue(null);

    await expect(requireAmpaRole("MANAGE_MEMBERS")).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("bloquea (404) si el subdominio no corresponde a ninguna AMPA", async () => {
    mockHeaders.mockResolvedValue(headerStore("subdominio-que-no-existe"));
    mockAuth.mockResolvedValue(null);

    await expect(requireAmpaRole("MANAGE_MEMBERS")).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("redirige a /login si el subdominio es válido pero no hay sesión", async () => {
    mockHeaders.mockResolvedValue(headerStore("test-ampa-authz"));
    mockAuth.mockResolvedValue(null);

    await expect(requireAmpaRole("MANAGE_MEMBERS")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });

  it("bloquea (404) a un usuario autenticado sin NINGÚN rol en esta AMPA (aunque sea presidente de otra)", async () => {
    mockHeaders.mockResolvedValue(headerStore("test-ampa-authz"));
    mockAuth.mockResolvedValue({ user: { id: noRoleUserId } });

    await expect(requireAmpaRole("MANAGE_MEMBERS")).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("bloquea (404) a un usuario con rol FAMILIA pidiendo un permiso de gestión (MANAGE_MEMBERS)", async () => {
    mockHeaders.mockResolvedValue(headerStore("test-ampa-authz"));
    mockAuth.mockResolvedValue({ user: { id: familiaUserId } });

    await expect(requireAmpaRole("MANAGE_MEMBERS")).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });

  it("deja pasar a un usuario con rol PRESIDENCIA en ESTA AMPA y devuelve el contexto correcto", async () => {
    mockHeaders.mockResolvedValue(headerStore("test-ampa-authz"));
    mockAuth.mockResolvedValue({ user: { id: presidenciaUserId } });

    const context = await requireAmpaRole("MANAGE_MEMBERS");

    expect(context.userId).toBe(presidenciaUserId);
    expect(context.ampaId).toBe(ampaId);
    expect(context.roles).toContain("PRESIDENCIA");
  });

  it("un rol de FAMILIA sí pasa para un permiso que le corresponde (VIEW_OWN_FAMILY)", async () => {
    mockHeaders.mockResolvedValue(headerStore("test-ampa-authz"));
    mockAuth.mockResolvedValue({ user: { id: familiaUserId } });

    const context = await requireAmpaRole("VIEW_OWN_FAMILY");

    expect(context.userId).toBe(familiaUserId);
    expect(context.roles).toContain("FAMILIA");
  });
});
