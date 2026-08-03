import { redirect, notFound } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

export interface PlatformAdminContext {
  userId: string;
}

/**
 * Puerta de entrada para `/admin` (panel de superadmin de PLATAFORMA — equipo de
 * Gigson/la ONG). Deliberadamente NO usa `requireAmpaRole`: no hay ningún
 * subdominio/AMPA que resolver, el acceso es transversal a todas las AMPAs. Exige
 * sesión NextAuth + `User.isPlatformAdmin === true` — un rol `SUPERADMIN` dentro
 * de `UserAmpaRole` (una AMPA concreta) NO da acceso aquí, son conceptos
 * distintos a propósito (ver comentario en `schema.prisma` > `User`).
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.isPlatformAdmin) notFound();

  return { userId: user.id };
}
