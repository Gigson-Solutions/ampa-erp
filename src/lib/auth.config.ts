import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { sendVerificationRequest } from "./mail/ses";

// El magic link es el único mecanismo de acceso real, pero en desarrollo obliga a ir a
// buscar el enlace al log en cada prueba. Este proveedor permite entrar de un clic como
// cualquier usuario ya existente (los del seed), sin token ni contraseña.
//
// NO es un bypass de autorización: solo resuelve identidad. Los permisos por AMPA se
// siguen comprobando en `requireAmpaRole` contra `UserAmpaRole`, así que entrar como
// presidencia de una AMPA no da acceso a otra. Y no crea usuarios: si el email no está
// en la base de datos, no deja entrar.
//
// Queda fuera del bundle en producción por el guard de `NODE_ENV` — si algún día se
// despliega con NODE_ENV distinto de "production", este proveedor volvería a estar
// activo, así que ese guard es la única cosa que no debe tocarse aquí.
const isProduction = process.env.NODE_ENV === "production";

const devQuickLogin = Credentials({
  id: "dev-quick-login",
  name: "Acceso rápido (solo desarrollo)",
  credentials: { email: { label: "Email", type: "email" } },
  async authorize(credentials) {
    if (isProduction) return null;
    const email = credentials?.["email"];
    if (typeof email !== "string" || email.length === 0) return null;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  },
});

// Sin proveedores OAuth: solo magic link (ver decisión confirmada — diverge del
// OAuth/SSO de erp-awesomely a propósito, las familias no tienen SSO corporativo).
// Se usa el proveedor "nodemailer" (no el deprecado "email") pero con
// `sendVerificationRequest` sustituido por Amazon SES — no se usa SMTP real.
export const authConfig = {
  providers: [
    Nodemailer({
      from: process.env["AUTH_EMAIL_FROM"],
      // Auth.js valida que `server` exista aunque no se use realmente — nuestro
      // `sendVerificationRequest` sustituye por completo el envío vía SMTP/SES,
      // así que este valor nunca se conecta a nada.
      server: "smtp://unused:unused@localhost:25",
      sendVerificationRequest,
    }),
    ...(isProduction ? [] : [devQuickLogin]),
  ] satisfies Provider[],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
