import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createMinutesEntry, listMinutesEntries, verifyMinutesChain } from "../src/lib/minutes";

describe("libro de actas: cadena de hashes (Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-MINUTES" },
      update: {},
      create: { name: "Test Center Minutes", code: "TEST-CENTER-MINUTES" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-minutes" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Minutes", subdomain: "test-ampa-minutes" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-minutes-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Minutes Other", subdomain: "test-ampa-minutes-other" },
    });
    otherAmpaId = otherAmpa.id;
  });

  afterAll(async () => {
    await prisma.minutesEntry.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-MINUTES" } });
    await prisma.$disconnect();
  });

  it("el primer asiento no tiene previousHash (génesis) y empieza en el nº 1", async () => {
    const entry = await createMinutesEntry(ampaId, {
      title: "Constitución de la junta",
      body: "Se constituye la junta directiva...",
      signedByName: "Ana Presidenta",
    });

    expect(entry.sequenceNumber).toBe(1);
    expect(entry.previousHash).toBeNull();
    expect(entry.hash).toHaveLength(64); // sha256 hex
  });

  it("cada asiento enlaza con el hash del anterior, en secuencia correlativa", async () => {
    const second = await createMinutesEntry(ampaId, {
      title: "Aprobación de presupuesto",
      body: "Se aprueba el presupuesto anual...",
      signedByName: "Ana Presidenta",
    });

    const entries = await listMinutesEntries(ampaId);
    const first = entries.find((e) => e.sequenceNumber === 1);

    expect(second.sequenceNumber).toBe(2);
    expect(second.previousHash).toBe(first?.hash);
  });

  it("verifyMinutesChain confirma que el libro está íntegro", async () => {
    const verification = await verifyMinutesChain(ampaId);
    expect(verification.valid).toBe(true);
    expect(verification.entryCount).toBe(2);
    expect(verification.brokenAtSequence).toBeNull();
  });

  it("detecta manipulación directa en la base de datos (contenido alterado sin pasar por createMinutesEntry)", async () => {
    const entries = await listMinutesEntries(ampaId);
    const target = entries.find((e) => e.sequenceNumber === 1);
    if (!target) throw new Error("fixture inválida");

    // Simula un ataque/bug que modifica el acta directamente, saltándose la
    // única vía legítima (createMinutesEntry, que nunca hace update).
    await prisma.minutesEntry.update({
      where: { id: target.id },
      data: { body: "Contenido alterado a posteriori" },
    });

    const verification = await verifyMinutesChain(ampaId);
    expect(verification.valid).toBe(false);
    expect(verification.brokenAtSequence).toBe(1);
    expect(verification.reason).toContain("hash");

    // Restaura el estado para no contaminar el resto de tests de este fichero.
    await prisma.minutesEntry.update({
      where: { id: target.id },
      data: { body: "Se constituye la junta directiva..." },
    });
  });

  it("un libro vacío se considera íntegro (caso base, sin actas todavía)", async () => {
    const verification = await verifyMinutesChain(otherAmpaId);
    expect(verification.valid).toBe(true);
    expect(verification.entryCount).toBe(0);
  });

  it("no permite ver actas de otra AMPA (aislamiento multi-tenant)", async () => {
    const entriesFromOtherAmpa = await listMinutesEntries(otherAmpaId);
    expect(entriesFromOtherAmpa).toHaveLength(0);
  });

  it("rechaza un acta sin firmante", async () => {
    await expect(
      createMinutesEntry(ampaId, { title: "Sin firma", body: "...", signedByName: "" }),
    ).rejects.toThrow();
  });

  it("capa 3 (RLS) por sí sola bloquea la lectura cross-tenant, incluso saltándose $extends", async () => {
    // Verificación directa de defensa en profundidad — igual patrón que
    // tests/tenant-isolation.test.ts. Esto es justo lo que habría detectado el
    // bug real de esta pieza (MinutesEntry sin política RLS) si la capa 2
    // (TENANT_SCOPED_MODELS) hubiera estado bien pero la RLS no: sin este test,
    // una regresión futura en cualquiera de las dos capas podría pasar
    // desapercibida si la otra sigue funcionando.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE ampa_erp_app`;
      await tx.$executeRaw`SELECT set_config('app.current_ampa', ${otherAmpaId}, true)`;
      const rows = await tx.minutesEntry.findMany({ where: { ampaId } });
      expect(rows).toHaveLength(0);
    });
  });
});
