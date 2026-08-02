import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

// Nota importante: el `ampaId` activo de la sesión NO se decide aquí en base a lo
// que mande el cliente — se resuelve por subdominio en `proxy.ts` y se valida
// contra `UserAmpaRole` en cada Server Component / server action antes de llamar a
// `withAmpaScope`. Este módulo solo gestiona identidad (quién eres), no autorización
// por tenant (a qué AMPA perteneces con qué rol) — eso vive en `src/lib/authz.ts`.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});
