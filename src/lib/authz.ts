import type { AmpaRole } from "@prisma/client";
import { prisma } from "./prisma";

// Matriz de permisos por rol (ver CLAUDE.md / plan de visión > Roles). Fase 0 solo
// define la forma; el detalle fino de qué puede hacer cada rol se completa en Fase 1
// a medida que existan las acciones concretas (cobros, cuotas, extraescolares...).
export const PERMISSIONS = {
  MANAGE_AMPA_SETTINGS: ["SUPERADMIN", "PRESIDENCIA"],
  MANAGE_TREASURY: ["SUPERADMIN", "PRESIDENCIA", "TESORERIA"],
  MANAGE_MEMBERS: ["SUPERADMIN", "PRESIDENCIA", "SECRETARIA"],
  MANAGE_ACTIVITIES: ["SUPERADMIN", "PRESIDENCIA", "VOCAL", "COMISION"],
  MANAGE_COMMUNICATIONS: ["SUPERADMIN", "PRESIDENCIA", "SECRETARIA", "VOCAL"],
  VIEW_OWN_ACTIVITIES: ["PROVEEDOR", "MONITOR"],
  VIEW_OWN_FAMILY: ["FAMILIA"],
} as const satisfies Record<string, readonly AmpaRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Resuelve los roles reales de un usuario para una AMPA concreta. Fuente única de
 * verdad de autorización por tenant — el `ampaId` debe venir ya validado (resuelto
 * por subdominio en proxy.ts, nunca directamente del cliente).
 */
export async function getUserRolesForAmpa(userId: string, ampaId: string): Promise<AmpaRole[]> {
  const rows = await prisma.userAmpaRole.findMany({
    where: { userId, ampaId },
    select: { role: true },
  });
  return rows.map((row) => row.role);
}

export function hasPermission(userRoles: readonly AmpaRole[], permission: Permission): boolean {
  const allowedRoles: readonly AmpaRole[] = PERMISSIONS[permission];
  return userRoles.some((role) => allowedRoles.includes(role));
}
