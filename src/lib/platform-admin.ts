import { z } from "zod";
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

// Feedback de usuario (2026-08-11): "desarrolla todas las pantallas
// necesarias" para el panel de admin — hoy solo era una tabla de solo
// lectura. Todo lo que sigue sigue el mismo criterio que `listAmpasOverview`:
// cliente `prisma` base (nunca `withAmpaScope`, que aísla una AMPA concreta,
// justo lo contrario de lo que necesita un panel transversal), y la única
// barrera de seguridad es `requirePlatformAdmin` en la capa de arriba.

export const createAmpaSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "El subdominio solo puede tener letras minúsculas, números y guiones"),
  locale: z.enum(["es", "ca", "eu", "gl", "va"]).default("es"),
  centerId: z.string().min(1).optional(),
  newCenterName: z.string().trim().min(1).optional(),
  newCenterCode: z.string().trim().min(1).optional(),
  academicYearLabel: z.string().trim().min(1, "El curso académico es obligatorio"),
  academicYearStart: z.coerce.date(),
  academicYearEnd: z.coerce.date(),
});

export type CreateAmpaInput = z.infer<typeof createAmpaSchema>;

/**
 * Alta de una AMPA nueva (onboarding de un tenant) — hasta ahora solo se
 * podía hacer editando `prisma/seed.ts` a mano o con Prisma Studio. Crea
 * también su primer curso académico (activo) en la misma operación, porque
 * una AMPA sin curso académico no puede tener cuotas ni actividades.
 */
export async function createAmpa(input: CreateAmpaInput): Promise<{ id: string }> {
  const parsed = createAmpaSchema.parse(input);

  let centerId = parsed.centerId;
  if (!centerId) {
    if (!parsed.newCenterName || !parsed.newCenterCode) {
      throw new Error("Hay que elegir un centro existente o indicar nombre y código de uno nuevo");
    }
    const center = await prisma.center.create({ data: { name: parsed.newCenterName, code: parsed.newCenterCode } });
    centerId = center.id;
  }

  const ampa = await prisma.ampa.create({
    data: {
      centerId,
      name: parsed.name,
      subdomain: parsed.subdomain,
      locale: parsed.locale,
    },
  });

  await prisma.academicYear.create({
    data: {
      ampaId: ampa.id,
      label: parsed.academicYearLabel,
      startDate: parsed.academicYearStart,
      endDate: parsed.academicYearEnd,
      isActive: true,
    },
  });

  return { id: ampa.id };
}

export interface CenterOption {
  id: string;
  name: string;
}

export async function listCenters(): Promise<CenterOption[]> {
  const centers = await prisma.center.findMany({ orderBy: { name: "asc" } });
  return centers.map((center) => ({ id: center.id, name: center.name }));
}

export interface AmpaDetail {
  id: string;
  name: string;
  subdomain: string;
  locale: string;
  active: boolean;
  centerName: string;
  sepaCreditorId: string | null;
  sepaCreditorName: string | null;
  sepaIban: string | null;
  academicYears: Array<{ id: string; label: string; isActive: boolean }>;
}

export async function getAmpaDetail(ampaId: string): Promise<AmpaDetail | null> {
  const ampa = await prisma.ampa.findUnique({
    where: { id: ampaId },
    include: { center: true, academicYears: { orderBy: { startDate: "desc" } } },
  });
  if (!ampa) return null;

  return {
    id: ampa.id,
    name: ampa.name,
    subdomain: ampa.subdomain,
    locale: ampa.locale,
    active: ampa.active,
    centerName: ampa.center.name,
    sepaCreditorId: ampa.sepaCreditorId,
    sepaCreditorName: ampa.sepaCreditorName,
    sepaIban: ampa.sepaIban,
    academicYears: ampa.academicYears.map((year) => ({ id: year.id, label: year.label, isActive: year.isActive })),
  };
}

export const updateAmpaSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  active: z.boolean(),
  sepaCreditorId: z.string().trim().min(1).optional(),
  sepaCreditorName: z.string().trim().min(1).optional(),
  sepaIban: z.string().trim().min(1).optional(),
  activeAcademicYearId: z.string().min(1).optional(),
});

export type UpdateAmpaInput = z.infer<typeof updateAmpaSchema>;

export async function updateAmpa(ampaId: string, input: UpdateAmpaInput): Promise<void> {
  const parsed = updateAmpaSchema.parse(input);

  const ampa = await prisma.ampa.findUnique({ where: { id: ampaId } });
  if (!ampa) throw new Error("AMPA no encontrada");

  await prisma.ampa.update({
    where: { id: ampaId },
    data: {
      name: parsed.name,
      active: parsed.active,
      sepaCreditorId: parsed.sepaCreditorId ?? null,
      sepaCreditorName: parsed.sepaCreditorName ?? null,
      sepaIban: parsed.sepaIban ?? null,
    },
  });

  // Un único curso académico activo por AMPA — si se marca uno como activo,
  // el resto se desactivan (no forzado por constraint en la base de datos,
  // se mantiene aquí porque es la única operación que lo cambia).
  if (parsed.activeAcademicYearId) {
    await prisma.academicYear.updateMany({ where: { ampaId }, data: { isActive: false } });
    await prisma.academicYear.update({
      where: { id: parsed.activeAcademicYearId },
      data: { isActive: true },
    });
  }
}

export interface PlatformAdminSummary {
  userId: string;
  name: string | null;
  email: string;
}

export async function listPlatformAdmins(): Promise<PlatformAdminSummary[]> {
  const users = await prisma.user.findMany({ where: { isPlatformAdmin: true }, orderBy: { createdAt: "asc" } });
  return users.map((user) => ({ userId: user.id, name: user.name, email: user.email }));
}

export const invitePlatformAdminSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Email no válido"),
});

export type InvitePlatformAdminInput = z.infer<typeof invitePlatformAdminSchema>;

export async function invitePlatformAdmin(input: InvitePlatformAdminInput): Promise<PlatformAdminSummary> {
  const parsed = invitePlatformAdminSchema.parse(input);

  const user = await prisma.user.upsert({
    where: { email: parsed.email },
    update: { isPlatformAdmin: true },
    create: { email: parsed.email, name: parsed.name, isPlatformAdmin: true },
  });

  return { userId: user.id, name: user.name, email: user.email };
}

/**
 * Quita el flag de superadmin de plataforma — nunca borra el `User` (podría
 * tener roles de junta en alguna AMPA, que son conceptos distintos).
 */
export async function removePlatformAdmin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isPlatformAdmin) throw new Error("Este usuario no es superadmin de plataforma");

  await prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: false } });
}
