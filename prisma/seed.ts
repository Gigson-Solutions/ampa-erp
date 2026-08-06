import { prisma } from "../src/lib/prisma";

// Dos AMPAs de prueba en centros distintos, con datos cruzados suficientes para el
// test de aislamiento multi-tenant (tests/tenant-isolation.test.ts): cada una con su
// propia familia, para verificar que la AMPA A nunca puede leer/escribir datos de la
// AMPA B por ninguna vía.
async function main(): Promise<void> {
  const centerA = await prisma.center.upsert({
    where: { code: "IES-CAMPANAR" },
    update: {},
    create: { name: "IES Campanar", code: "IES-CAMPANAR" },
  });

  const centerB = await prisma.center.upsert({
    where: { code: "IES-MONTE-ALTO" },
    update: {},
    create: { name: "IES Monte Alto", code: "IES-MONTE-ALTO" },
  });

  const ampaA = await prisma.ampa.upsert({
    where: { subdomain: "campanar" },
    update: {},
    create: {
      centerId: centerA.id,
      name: "AMPA IES Campanar",
      subdomain: "campanar",
      locale: "es",
    },
  });

  const ampaB = await prisma.ampa.upsert({
    where: { subdomain: "montealto" },
    update: {},
    create: {
      centerId: centerB.id,
      name: "AMPA IES Monte Alto",
      subdomain: "montealto",
      locale: "ca",
    },
  });

  const yearA = await prisma.academicYear.upsert({
    where: { ampaId_label: { ampaId: ampaA.id, label: "2026-2027" } },
    update: {},
    create: {
      ampaId: ampaA.id,
      label: "2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });

  const yearB = await prisma.academicYear.upsert({
    where: { ampaId_label: { ampaId: ampaB.id, label: "2026-2027" } },
    update: {},
    create: {
      ampaId: ampaB.id,
      label: "2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });

  const familyA = await prisma.family.create({
    data: { ampaId: ampaA.id, referenceCode: "A-0001" },
  });

  const familyB = await prisma.family.create({
    data: { ampaId: ampaB.id, referenceCode: "B-0001" },
  });

  await prisma.guardian.create({
    data: {
      familyId: familyA.id,
      name: "Familia de prueba A",
      email: "familia-a@example.com",
    },
  });

  await prisma.guardian.create({
    data: {
      familyId: familyB.id,
      name: "Familia de prueba B",
      email: "familia-b@example.com",
    },
  });

  // Cuota de prueba para poder probar en local el alta de membresía (board).
  const feeSchemaA = await prisma.feeSchema.upsert({
    where: { id: "seed-fee-schema-a" },
    update: {},
    create: {
      id: "seed-fee-schema-a",
      ampaId: ampaA.id,
      academicYearId: yearA.id,
      name: "Cuota estándar",
      amount: 100,
      discountRules: { siblingDiscountPercent: 10, largeFamilyDiscountPercent: 15 },
    },
  });

  // Usuario de junta de prueba (PRESIDENCIA de ampaA) para poder entrar en local a
  // /campanar/families y /campanar/memberships: pide el magic link con
  // este email en /login — en desarrollo (sin credenciales AWS) el enlace se
  // imprime en la consola de `pnpm dev` en vez de enviarse por email de verdad.
  const boardUser = await prisma.user.upsert({
    where: { email: "presidencia@example.com" },
    update: {},
    create: { email: "presidencia@example.com", name: "Presidenta de prueba" },
  });

  await prisma.userAmpaRole.upsert({
    where: { userId_ampaId_role: { userId: boardUser.id, ampaId: ampaA.id, role: "PRESIDENCIA" } },
    update: {},
    create: { userId: boardUser.id, ampaId: ampaA.id, role: "PRESIDENCIA" },
  });

  // Superadmin de PLATAFORMA de prueba (equipo Gigson/ONG) para poder entrar en
  // local a /admin — distinto del PRESIDENCIA de arriba, que solo ve su AMPA.
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { isPlatformAdmin: true },
    create: { email: "admin@example.com", name: "Admin de plataforma", isPlatformAdmin: true },
  });

  console.log("Seed OK:", {
    ampaA: ampaA.subdomain,
    ampaB: ampaB.subdomain,
    yearA: yearA.label,
    yearB: yearB.label,
    familyA: familyA.referenceCode,
    familyB: familyB.referenceCode,
    feeSchemaA: feeSchemaA.name,
    boardUser: boardUser.email,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
