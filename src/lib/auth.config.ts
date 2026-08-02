import type { NextAuthConfig } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { sendVerificationRequest } from "./mail/ses";

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
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
