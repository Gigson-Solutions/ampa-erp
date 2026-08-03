import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Aislamiento multi-tenant — capas 2 y 3 de la arquitectura (ver CLAUDE.md):
 *
 * 2. Esta extensión de Prisma inyecta `where: { ampaId }` / `data.ampaId` en toda
 *    operación sobre un modelo "de negocio" (ver TENANT_SCOPED_MODELS).
 * 3. `withAmpaScope` ejecuta cada request dentro de una transacción interactiva que
 *    primero fija `app.current_ampa` vía `set_config` (RLS lee esa variable de
 *    sesión). Si (1) proxy.ts y (2) fallan, la política RLS de Postgres sigue
 *    bloqueando el acceso — ver prisma/migrations/*_rls/migration.sql.
 *
 * Uso en server actions / route handlers:
 *
 *   const families = await withAmpaScope(ampaId, (db) => db.family.findMany());
 */

// Modelos de negocio que llevan `ampaId` — mantener sincronizado con schema.prisma.
const TENANT_SCOPED_MODELS = new Set([
  "AcademicYear",
  "Family",
  "FeeSchema",
  "Membership",
  "Charge",
  "Payment",
  "Provider",
  "Activity",
  "Event",
  "Announcement",
  "Document",
  "LedgerEntry",
  "UserAmpaRole",
  "MinutesEntry",
]);

const WRITE_OPERATIONS_WITH_DATA = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
]);

const WHERE_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "upsert",
]);

function scopeArgs(operation: string, args: Record<string, unknown>, ampaId: string): Record<string, unknown> {
  const scoped: Record<string, unknown> = { ...args };

  if (WHERE_OPERATIONS.has(operation)) {
    scoped["where"] = { ...(scoped["where"] as Record<string, unknown> | undefined), ampaId };
  }

  if (operation === "create") {
    scoped["data"] = { ...(scoped["data"] as Record<string, unknown>), ampaId };
  }

  if (operation === "createMany" && Array.isArray(scoped["data"])) {
    scoped["data"] = (scoped["data"] as Record<string, unknown>[]).map((row) => ({
      ...row,
      ampaId,
    }));
  }

  if (operation === "upsert") {
    scoped["create"] = { ...(scoped["create"] as Record<string, unknown>), ampaId };
  }

  if (!WRITE_OPERATIONS_WITH_DATA.has(operation) && !WHERE_OPERATIONS.has(operation)) {
    // Operaciones no contempladas explícitamente (p.ej. groupBy): fallar cerrado
    // en vez de dejar pasar sin scope. Ampliar esta lista según se necesite.
    throw new Error(
      `withAmpaScope: operación "${operation}" no tiene reglas de scoping definidas — añadir soporte explícito antes de usarla.`,
    );
  }

  return scoped;
}

// Importante: la extensión se aplica sobre el CLIENTE BASE (no sobre el `tx` de una
// transacción ya abierta) — `Prisma.TransactionClient` no expone `$extends`, y es
// justamente llamando a `$transaction` sobre un cliente ya extendido como el `tx`
// resultante hereda el comportamiento de scoping en cada query.
function scopeClient(base: PrismaClient, ampaId: string) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }
          const scopedArgs = scopeArgs(operation, args as Record<string, unknown>, ampaId);
          return query(scopedArgs);
        },
      },
    },
  });
}

type ScopedClient = ReturnType<typeof scopeClient>;
export type TenantScopedClient = Parameters<Parameters<ScopedClient["$transaction"]>[0]>[0];

/**
 * Punto de entrada obligatorio para leer/escribir modelos de negocio. Abre una
 * transacción interactiva sobre un cliente extendido con el filtro `ampaId`, y de
 * paso fija la variable de sesión que usa RLS como red de seguridad final.
 *
 * `fn` recibe también `ampaId` de vuelta (aunque ya se pasó como primer argumento)
 * para que los `create({ data: { ampaId, ... } })` type-checkeen sin `as any`: los
 * tipos generados por Prisma no saben que la extensión de la capa 2 va a inyectar
 * `ampaId` en tiempo de ejecución, así que hay que dárselo explícitamente para
 * satisfacer al compilador. La extensión SIEMPRE sobreescribe ese valor con el
 * `ampaId` real al final (ver `scopeArgs`), así que pasar un valor "de más" aquí es
 * inofensivo — nunca puede usarse para escribir en la AMPA equivocada.
 */
export async function withAmpaScope<T>(
  ampaId: string,
  fn: (db: TenantScopedClient, ampaId: string) => Promise<T>,
  client: PrismaClient = prisma,
): Promise<T> {
  const scopedClient = scopeClient(client, ampaId);
  return scopedClient.$transaction(async (tx) => {
    // El orden importa: primero se baja de privilegios (la conexión de la app suele
    // ser superuser/owner de las tablas — ver migración `*_app_role` — y los
    // superusuarios tienen BYPASSRLS implícito, lo que anularía la RLS por completo
    // si no se hiciera este cambio de rol). Los custom GUC como `app.current_ampa`
    // los puede fijar cualquier rol sin privilegios especiales.
    await tx.$executeRaw`SET LOCAL ROLE ampa_erp_app`;
    await tx.$executeRaw`SELECT set_config('app.current_ampa', ${ampaId}, true)`;
    return fn(tx, ampaId);
  });
}
