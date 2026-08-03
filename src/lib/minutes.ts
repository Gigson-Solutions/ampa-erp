import { createHash } from "node:crypto";
import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 2 (ver roadmap): "libro de actas con cadena de hashes (numeración
// inmutable, firma de presidente/secretario, sellado temporal) → prueba
// documental sólida". Es EL diferencial frente a miampa.com según el plan de
// visión, así que la integridad de la cadena es lo que hay que poder demostrar,
// no solo el CRUD.
//
// Deliberadamente NO hay `updateMinutesEntry` ni `deleteMinutesEntry` — el libro
// de actas por ley (LO 1/2002) no se puede alterar a posteriori. La firma se
// captura en la creación, nunca después, para no tener que mutar un asiento ya
// hasheado.

export const createMinutesEntrySchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(300),
  body: z.string().trim().min(1, "El contenido es obligatorio"),
  signedByName: z.string().trim().min(1, "Falta el nombre de quien firma"),
});

export type CreateMinutesEntryInput = z.infer<typeof createMinutesEntrySchema>;

export interface MinutesEntrySummary {
  id: string;
  sequenceNumber: number;
  title: string;
  body: string;
  previousHash: string | null;
  hash: string;
  signedByName: string;
  signedAt: Date;
}

function computeMinutesHash(input: {
  ampaId: string;
  sequenceNumber: number;
  title: string;
  body: string;
  previousHash: string | null;
  signedByName: string;
  signedAt: Date;
}): string {
  // Payload determinista y explícito (no `JSON.stringify` de un objeto, cuyo
  // orden de claves no está garantizado) — cualquier cambio en cualquier campo,
  // incluido `previousHash`, produce un hash distinto.
  const payload = [
    input.ampaId,
    input.sequenceNumber,
    input.title,
    input.body,
    input.previousHash ?? "GENESIS",
    input.signedByName,
    input.signedAt.toISOString(),
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Añade un asiento al libro de actas. Bloquea la fila de la propia AMPA
 * (`FOR UPDATE`) mientras calcula el siguiente número de secuencia, para que dos
 * creaciones simultáneas no puedan asignarse el mismo número o encadenar mal el
 * hash anterior.
 */
export async function createMinutesEntry(
  ampaId: string,
  input: CreateMinutesEntryInput,
): Promise<MinutesEntrySummary> {
  const parsed = createMinutesEntrySchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    await db.$queryRaw`SELECT id FROM ampas WHERE id = ${scopedAmpaId} FOR UPDATE`;

    const last = await db.minutesEntry.findFirst({
      where: { ampaId: scopedAmpaId },
      orderBy: { sequenceNumber: "desc" },
    });

    const sequenceNumber = (last?.sequenceNumber ?? 0) + 1;
    const previousHash = last?.hash ?? null;
    const signedAt = new Date();

    const hash = computeMinutesHash({
      ampaId: scopedAmpaId,
      sequenceNumber,
      title: parsed.title,
      body: parsed.body,
      previousHash,
      signedByName: parsed.signedByName,
      signedAt,
    });

    const entry = await db.minutesEntry.create({
      data: {
        ampaId: scopedAmpaId,
        sequenceNumber,
        title: parsed.title,
        body: parsed.body,
        previousHash,
        hash,
        signedByName: parsed.signedByName,
        signedAt,
      },
    });

    return entry;
  });
}

export async function listMinutesEntries(ampaId: string): Promise<MinutesEntrySummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    return db.minutesEntry.findMany({ orderBy: { sequenceNumber: "asc" } });
  });
}

export interface MinutesChainVerification {
  valid: boolean;
  entryCount: number;
  brokenAtSequence: number | null;
  reason: string | null;
}

/**
 * Recorre todo el libro de actas y recalcula cada hash a partir de sus propios
 * campos almacenados, comprobando que coincide con el guardado Y que enlaza
 * correctamente con el hash del asiento anterior. Si alguien modificó una fila
 * directamente en la base de datos (saltándose `createMinutesEntry`), esta
 * función lo detecta — es la prueba documental que vende el diferencial.
 */
export async function verifyMinutesChain(ampaId: string): Promise<MinutesChainVerification> {
  const entries = await listMinutesEntries(ampaId);

  if (entries.length === 0) {
    return { valid: true, entryCount: 0, brokenAtSequence: null, reason: null };
  }

  let expectedPreviousHash: string | null = null;

  for (const entry of entries) {
    if (entry.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        entryCount: entries.length,
        brokenAtSequence: entry.sequenceNumber,
        reason: "El enlace con el asiento anterior no coincide (previousHash alterado o asiento eliminado/reordenado).",
      };
    }

    const recomputedHash = computeMinutesHash({
      ampaId,
      sequenceNumber: entry.sequenceNumber,
      title: entry.title,
      body: entry.body,
      previousHash: entry.previousHash,
      signedByName: entry.signedByName,
      signedAt: entry.signedAt,
    });

    if (recomputedHash !== entry.hash) {
      return {
        valid: false,
        entryCount: entries.length,
        brokenAtSequence: entry.sequenceNumber,
        reason: "El contenido del asiento no coincide con su hash almacenado (modificado a posteriori).",
      };
    }

    expectedPreviousHash = entry.hash;
  }

  return { valid: true, entryCount: entries.length, brokenAtSequence: null, reason: null };
}
