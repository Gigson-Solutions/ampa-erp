import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { getUserRolesForAmpa, hasPermission, type Permission } from "./authz";
import type { AmpaRole } from "@prisma/client";

export interface AmpaSessionContext {
  userId: string;
  ampaId: string;
  roles: AmpaRole[];
}

/**
 * Puerta de entrada obligatoria para cualquier Server Action / Server Component de
 * `(board)`: resuelve la AMPA activa por subdominio (nunca por lo que mande el
 * cliente en el body/params), exige sesión NextAuth, y comprueba que el usuario
 * tiene el permiso pedido PARA ESA AMPA CONCRETA — un presidente de la AMPA A no
 * tiene automáticamente ningún rol en la AMPA B aunque esté autenticado.
 */
export async function requireAmpaRole(permission: Permission): Promise<AmpaSessionContext> {
  const headerList = await headers();
  const ampaSubdomain = headerList.get("x-ampa-subdomain");
  if (!ampaSubdomain) notFound();

  const ampa = await prisma.ampa.findUnique({ where: { subdomain: ampaSubdomain } });
  if (!ampa) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const roles = await getUserRolesForAmpa(session.user.id, ampa.id);
  if (!hasPermission(roles, permission)) {
    // Forbidden: el usuario existe y tiene sesión, pero no tiene el rol necesario
    // para esta AMPA. Se trata como "no encontrado" en vez de un 403 explícito para
    // no confirmar a un atacante que el recurso existe.
    notFound();
  }

  return { userId: session.user.id, ampaId: ampa.id, roles };
}
