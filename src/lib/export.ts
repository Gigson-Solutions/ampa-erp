import { prisma } from "./prisma";
import { withAmpaScope } from "./tenant";

// Fase 1 (ver roadmap): "exportación íntegra de datos (anti lock-in)". Coherente
// con el posicionamiento de la ONG: ninguna AMPA debe quedar atrapada si algún día
// decide dejar de usar la plataforma. Exporta TODO lo que pertenece a la AMPA en
// un único JSON estructurado — nada de paginación ni filtros, es una exportación
// completa pensada para migración/backup, no para consumo incremental.

export interface AmpaExport {
  exportedAt: string;
  ampa: { id: string; name: string; subdomain: string; locale: string };
  academicYears: unknown[];
  families: unknown[];
  memberships: unknown[];
  feeSchemas: unknown[];
  charges: unknown[];
  payments: unknown[];
  activities: unknown[];
  events: unknown[];
  announcements: unknown[];
  documents: unknown[];
}

export async function exportAmpaData(ampaId: string): Promise<AmpaExport> {
  // `Ampa` no está en TENANT_SCOPED_MODELS (es la propia raíz del tenant, no se
  // filtra a sí misma) — se consulta directamente, confiando en que quien llama ya
  // ha validado este `ampaId` (p.ej. `requireAmpaRole`).
  const ampa = await prisma.ampa.findUnique({ where: { id: ampaId } });
  if (!ampa) throw new Error("AMPA no encontrada");

  return withAmpaScope(ampaId, async (db) => {
    // Importante: TODAS estas consultas comparten la MISMA conexión (la
    // transacción interactiva de `withAmpaScope` reserva una única conexión del
    // pool). Lanzarlas en paralelo con `Promise.all` no las paraleliza de verdad —
    // node-postgres solo puede procesar una query a la vez por conexión — y
    // `pg` lo marca como uso deprecado (puede corromper resultados en versiones
    // futuras). Se consultan en serie a propósito.
    const academicYears = await db.academicYear.findMany();
    // Nota (2026-08-03): esta consulta con `include` anidado en 2 niveles produce
    // el mismo aviso de deprecación de `pg`, pero NO por nada que hagamos aquí —
    // el intérprete interno de Prisma 7 (`client-engine-runtime`) resuelve el
    // include anidado con varias sub-queries sobre la misma conexión de la
    // transacción. Verificado con `--trace-deprecation` que el stack apunta a
    // `query-interpreter.ts` de Prisma, no a este fichero. Los resultados son
    // correctos (cubierto por tests/export.test.ts) — queda como aviso conocido
    // de la combinación Prisma 7 + @prisma/adapter-pg + include anidado dentro de
    // una transacción interactiva, a vigilar en futuras actualizaciones de `pg`.
    const families = await db.family.findMany({
      include: { guardians: true, students: { include: { consents: true } }, consents: true },
    });
    const memberships = await db.membership.findMany();
    const feeSchemas = await db.feeSchema.findMany();
    const charges = await db.charge.findMany();
    const payments = await db.payment.findMany();
    const activities = await db.activity.findMany({ include: { enrollments: true, provider: true } });
    const events = await db.event.findMany({ include: { registrations: true } });
    const announcements = await db.announcement.findMany();
    const documents = await db.document.findMany();

    return {
      exportedAt: new Date().toISOString(),
      ampa: { id: ampa.id, name: ampa.name, subdomain: ampa.subdomain, locale: ampa.locale },
      academicYears,
      families,
      memberships,
      feeSchemas,
      charges,
      payments,
      activities,
      events,
      announcements,
      documents,
    };
  });
}
