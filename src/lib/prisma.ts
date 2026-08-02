import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Postgres self-hosted (no Neon/serverless) — a diferencia de erp-awesomely, que usa
// @prisma/adapter-neon porque despliega en Vercel. Prisma 7 exige un driver adapter
// explícito (ya no se puede poner `url` en el datasource de schema.prisma).
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
  return new PrismaClient({ adapter });
}

// Singleton "seguro para hot-reload" — patrón estándar de Next.js + Prisma para no
// agotar el pool de conexiones en desarrollo.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}
