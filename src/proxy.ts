import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Capa 1 del aislamiento multi-tenant (ver CLAUDE.md > Architecture): resuelve el
// subdominio a un `ampaSubdomain` y lo propaga en un header interno para que
// Server Components / Route Handlers puedan resolver el `ampaId` real (consultando
// Ampa.subdomain) y validar que la sesión NextAuth pertenece a esa AMPA.
//
// No se hace la consulta a la base de datos aquí a propósito — el proxy corre en el
// Edge Runtime y no debe depender de Prisma. La validación de sesión↔ampaId ocurre en
// `src/lib/auth.ts` (callback `session`) y en cada Server Component/acción.
//
// Nota: en Next.js 16 este fichero se llama `proxy.ts` (antes `middleware.ts`) — ver
// https://nextjs.org/docs/messages/middleware-to-proxy.

const ROOT_DOMAIN = process.env["ROOT_DOMAIN"] ?? "ampas.org";
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api", "admin"]);

function extractSubdomain(host: string): string | null {
  const hostname = host.split(":")[0] ?? "";
  if (!hostname.endsWith(ROOT_DOMAIN)) return null;

  const withoutRoot = hostname.slice(0, hostname.length - ROOT_DOMAIN.length).replace(/\.$/, "");
  if (!withoutRoot || RESERVED_SUBDOMAINS.has(withoutRoot)) return null;

  return withoutRoot;
}

export function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host);

  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set("x-ampa-subdomain", subdomain);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
