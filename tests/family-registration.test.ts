import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { registerFamily, registerFamilySchema } from "../src/lib/family-registration";
import { CONSENT_VERSION } from "../src/lib/consent";

// Fase 1, primera pieza del MVP (ver CLAUDE.md > Roadmap): alta de familia con
// consentimientos RGPD versionados. Verifica contra Postgres real que el alta crea
// Family + Guardian + Student(s) + Consent(s) correctamente scoped a la AMPA, y que
// los consentimientos quedan con evidencia de firma (versión, ip, hash).

describe("registerFamilySchema", () => {
  it("rechaza el alta si no se acepta el consentimiento de datos básicos", () => {
    const result = registerFamilySchema.safeParse({
      guardian: { name: "Ana García", email: "ana@example.com", dni: "12345678A", address: "Calle Falsa 123" },
      students: [{ name: "Luis García" }],
      consents: { data: false, image: false, centerShare: false },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza el alta sin ningún alumno/a", () => {
    const result = registerFamilySchema.safeParse({
      guardian: { name: "Ana García", email: "ana@example.com", dni: "12345678A", address: "Calle Falsa 123" },
      students: [],
      consents: { data: true, image: false, centerShare: false },
    });
    expect(result.success).toBe(false);
  });

  it("acepta un alta válida con dos alumnos", () => {
    const result = registerFamilySchema.safeParse({
      guardian: { name: "Ana García", email: "ana@example.com", dni: "12345678A", address: "Calle Falsa 123" },
      students: [{ name: "Luis García" }, { name: "Marta García" }],
      consents: { data: true, image: true, centerShare: false },
    });
    expect(result.success).toBe(true);
  });
});

describe("registerFamily (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-REG" },
      update: {},
      create: { name: "Test Center Reg", code: "TEST-CENTER-REG" },
    });
    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-reg" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Reg", subdomain: "test-ampa-reg" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-reg-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Reg Other", subdomain: "test-ampa-reg-other" },
    });
    otherAmpaId = otherAmpa.id;
  });

  afterAll(async () => {
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-REG" } });
    await prisma.$disconnect();
  });

  it("crea la familia, el tutor, los alumnos y los 3 consentimientos", async () => {
    const fixedNow = new Date("2026-08-02T10:00:00.000Z");

    const result = await registerFamily(
      ampaId,
      {
        guardian: { name: "Ana García", email: "ana@example.com", phone: "600000000", dni: "12345678A", address: "Calle Falsa 123" },
        students: [{ name: "Luis García" }, { name: "Marta García" }],
        consents: { data: true, image: true, centerShare: false },
      },
      { ip: "203.0.113.10", now: fixedNow },
    );

    expect(result.referenceCode).toMatch(/^F-[A-Z0-9]{8}$/);

    const family = await prisma.family.findUnique({
      where: { id: result.familyId },
      include: { guardians: true, students: true, consents: true },
    });

    expect(family).not.toBeNull();
    expect(family?.ampaId).toBe(ampaId);
    expect(family?.guardians).toHaveLength(1);
    expect(family?.guardians[0]?.email).toBe("ana@example.com");
    // Libro de socios: el tutor que da de alta la familia queda como socio/a
    // (isLegalMember) desde el propio momento del alta.
    expect(family?.guardians[0]?.dni).toBe("12345678A");
    expect(family?.guardians[0]?.address).toBe("Calle Falsa 123");
    expect(family?.guardians[0]?.isLegalMember).toBe(true);
    expect(family?.guardians[0]?.memberJoinedAt).toEqual(fixedNow);
    expect(family?.guardians[0]?.memberLeftAt).toBeNull();
    expect(family?.students).toHaveLength(2);
    expect(family?.consents).toHaveLength(3);

    const dataConsent = family?.consents.find((c) => c.type === "DATA");
    expect(dataConsent?.accepted).toBe(true);
    expect(dataConsent?.version).toBe(CONSENT_VERSION);
    expect(dataConsent?.ip).toBe("203.0.113.10");
    expect(dataConsent?.hash).toHaveLength(64); // sha256 hex

    const centerShareConsent = family?.consents.find((c) => c.type === "CENTER_SHARE");
    expect(centerShareConsent?.accepted).toBe(false);
  });

  it("no permite leer la familia recién creada desde otra AMPA (aislamiento multi-tenant)", async () => {
    const result = await registerFamily(
      ampaId,
      {
        guardian: { name: "Otro Tutor", email: "otro@example.com", dni: "87654321B", address: "Avenida Siempreviva 742" },
        students: [{ name: "Otro Alumno" }],
        consents: { data: true, image: false, centerShare: false },
      },
      { ip: "203.0.113.20" },
    );

    const { withAmpaScope } = await import("../src/lib/tenant");
    const familiesFromOtherAmpa = await withAmpaScope(otherAmpaId, (db) =>
      db.family.findMany({ where: { id: result.familyId } }),
    );
    expect(familiesFromOtherAmpa).toHaveLength(0);
  });
});
