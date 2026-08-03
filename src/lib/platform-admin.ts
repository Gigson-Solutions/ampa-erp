import { prisma } from "./prisma";

// Panel de superadmin de plataforma (ver roadmap: "panel superadmin"). Lee a
// propósito A TRAVÉS de todas las AMPAs — por eso usa el cliente `prisma` base
// directamente, NUNCA `withAmpaScope` (que está pensado justo para lo contrario:
// aislar una única AMPA). La única barrera de seguridad es `requirePlatformAdmin`
// en la capa de arriba — este módulo en sí no comprueba permisos, así que NUNCA se
// debe exponer desde una ruta que no pase primero por ese gate.

export interface AmpaOverview {
  id: string;
  name: string;
  subdomain: string;
  familyCount: number;
  pendingChargesCount: number;
  pendingChargesTotal: number;
  activeAcademicYearLabel: string | null;
}

export async function listAmpasOverview(): Promise<AmpaOverview[]> {
  const ampas = await prisma.ampa.findMany({ orderBy: { createdAt: "desc" } });

  const overview: AmpaOverview[] = [];

  // Cada AMPA se consulta con su propio Promise.all: a diferencia de
  // `withAmpaScope` (una única conexión reservada por transacción), `prisma` aquí
  // usa el pool normal — cada `await` puede resolver sobre conexiones distintas
  // sin el problema de concurrencia documentado en `export.ts`.
  for (const ampa of ampas) {
    const [familyCount, pendingChargesAgg, activeYear] = await Promise.all([
      prisma.family.count({ where: { ampaId: ampa.id } }),
      prisma.charge.aggregate({
        where: { ampaId: ampa.id, status: { in: ["PENDING", "OVERDUE"] } },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.academicYear.findFirst({ where: { ampaId: ampa.id, isActive: true } }),
    ]);

    overview.push({
      id: ampa.id,
      name: ampa.name,
      subdomain: ampa.subdomain,
      familyCount,
      pendingChargesCount: pendingChargesAgg._count,
      pendingChargesTotal: pendingChargesAgg._sum.amount?.toNumber() ?? 0,
      activeAcademicYearLabel: activeYear?.label ?? null,
    });
  }

  return overview;
}
