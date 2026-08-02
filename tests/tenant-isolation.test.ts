import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { withAmpaScope } from "../src/lib/tenant";

// Test crítico e irrenunciable (ver CLAUDE.md > Testing Strategy): un usuario de la
// AMPA A nunca debe poder leer/escribir datos de la AMPA B. Se prueban las tres vías
// de fuga: query "directa" con SET LOCAL correcto, query con where inyectado por
// withAmpaScope, y escritura cross-tenant.
//
// Requiere una base de datos de test con la migración `0001_rls` ya aplicada
// (`pnpm prisma migrate deploy` contra DATABASE_URL de test).

describe("aislamiento multi-tenant (RLS + Prisma $extends)", () => {
  let ampaAId: string;
  let ampaBId: string;
  let familyBId: string;

  beforeAll(async () => {
    const centerA = await prisma.center.upsert({
      where: { code: "TEST-CENTER-A" },
      update: {},
      create: { name: "Test Center A", code: "TEST-CENTER-A" },
    });
    const centerB = await prisma.center.upsert({
      where: { code: "TEST-CENTER-B" },
      update: {},
      create: { name: "Test Center B", code: "TEST-CENTER-B" },
    });
    const ampaA = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-a" },
      update: {},
      create: { centerId: centerA.id, name: "Test AMPA A", subdomain: "test-ampa-a" },
    });
    const ampaB = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-b" },
      update: {},
      create: { centerId: centerB.id, name: "Test AMPA B", subdomain: "test-ampa-b" },
    });
    ampaAId = ampaA.id;
    ampaBId = ampaB.id;

    const familyB = await prisma.family.create({
      data: { ampaId: ampaBId, referenceCode: "TEST-B-0001" },
    });
    familyBId = familyB.id;
  });

  afterAll(async () => {
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaAId, ampaBId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaAId, ampaBId] } } });
    await prisma.$disconnect();
  });

  it("capa 2 (Prisma $extends): withAmpaScope no puede leer datos de otra AMPA", async () => {
    const families = await withAmpaScope(ampaAId, (db) =>
      db.family.findMany({ where: { id: familyBId } }),
    );
    expect(families).toHaveLength(0);
  });

  it("capa 3 (RLS): simulando un bug en la capa 2 (where-injection sin aplicar), RLS bloquea igualmente la fuga", async () => {
    // Simula exactamente lo que hace withAmpaScope salvo por el $extends de la
    // capa 2 (como si scopeArgs tuviera un bug y no hubiera inyectado el `where`):
    // el rol sigue bajando de privilegios y el GUC sigue fijado, así que la RLS de
    // Postgres debe bloquear la fila igualmente.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE ampa_erp_app`;
      await tx.$executeRaw`SELECT set_config('app.current_ampa', ${ampaAId}, true)`;
      const rows = await tx.family.findMany({ where: { id: familyBId } });
      expect(rows).toHaveLength(0);
    });
  });

  it("confirma que SIN el cambio de rol (conexión de superusuario) la RLS no protege nada", async () => {
    // Documenta el hallazgo real de esta sesión: POSTGRES_USER es superuser en la
    // imagen oficial de postgres:16-alpine (BYPASSRLS implícito). Sin `SET LOCAL
    // ROLE ampa_erp_app`, ni siquiera fijar `app.current_ampa` sirve de nada — de
    // ahí que withAmpaScope SIEMPRE tenga que bajar de rol antes de tocar datos de
    // negocio. Este test existe para que, si algún día se cambia esa conexión a un
    // rol no-superuser por defecto, alguien note que este test empieza a fallar y
    // revise si el cambio de rol en withAmpaScope sigue siendo necesario.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_ampa', ${ampaAId}, true)`;
      const rows = await tx.family.findMany({ where: { id: familyBId } });
      expect(rows).toHaveLength(1);
    });
  });

  it("bloquea la escritura cross-tenant", async () => {
    await expect(
      withAmpaScope(ampaAId, (db) =>
        db.family.update({
          where: { id: familyBId },
          data: { referenceCode: "HACKED" },
        }),
      ),
    ).rejects.toThrow();
  });

  it("permite leer los propios datos con el ampaId correcto", async () => {
    const families = await withAmpaScope(ampaBId, (db) =>
      db.family.findMany({ where: { id: familyBId } }),
    );
    expect(families).toHaveLength(1);
  });
});
