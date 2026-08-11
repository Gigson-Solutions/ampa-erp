import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { listMembers, endMembership } from "../src/lib/members";
import { addContactToFamily } from "../src/lib/family-management";

// Libro de socios (LO 1/2002) — src/lib/members.ts. Un socio/a es un `Guardian`
// con `isLegalMember = true`; una persona de contacto (src/lib/family-management.ts,
// `addContactToFamily`) es un `Guardian` normal, sin ese flag.

describe("members / libro de socios (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let familyId: string;
  let legalMemberGuardianId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-MEMBERS" },
      update: {},
      create: { name: "Test Center Members", code: "TEST-CENTER-MEMBERS" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-members" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Members", subdomain: "test-ampa-members" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-members-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Members Other", subdomain: "test-ampa-members-other" },
    });
    otherAmpaId = otherAmpa.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "MEMBERS-0001" } });
    familyId = family.id;

    const legalMember = await prisma.guardian.create({
      data: {
        familyId,
        name: "Tutor Legal",
        email: "tutor.legal@example.com",
        dni: "22222222B",
        address: "Calle Test 2",
        isLegalMember: true,
        memberJoinedAt: new Date("2026-08-01"),
      },
    });
    legalMemberGuardianId = legalMember.id;

    // Guardian de OTRA AMPA, socio también, para verificar aislamiento.
    const otherFamily = await prisma.family.create({ data: { ampaId: otherAmpaId, referenceCode: "OTHER-0001" } });
    await prisma.guardian.create({
      data: {
        familyId: otherFamily.id,
        name: "Socio Ajeno",
        email: "ajeno@example.com",
        isLegalMember: true,
        memberJoinedAt: new Date("2026-08-01"),
      },
    });
  });

  afterAll(async () => {
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-MEMBERS" } });
    await prisma.$disconnect();
  });

  it("listMembers devuelve solo los socios de esta AMPA, activos", async () => {
    const members = await listMembers(ampaId);

    expect(members).toHaveLength(1);
    expect(members[0]?.name).toBe("Tutor Legal");
    expect(members[0]?.dni).toBe("22222222B");
    expect(members[0]?.active).toBe(true);
    expect(members[0]?.leftAt).toBeNull();
  });

  it("no filtra socios de otra AMPA (aislamiento multi-tenant)", async () => {
    const members = await listMembers(otherAmpaId);
    expect(members).toHaveLength(1);
    expect(members[0]?.name).toBe("Socio Ajeno");
  });

  it("endMembership da de baja al socio/a (fija memberLeftAt, no borra la fila)", async () => {
    await endMembership(ampaId, { guardianId: legalMemberGuardianId });

    const members = await listMembers(ampaId);
    expect(members).toHaveLength(1);
    expect(members[0]?.active).toBe(false);
    expect(members[0]?.leftAt).not.toBeNull();

    const guardian = await prisma.guardian.findUnique({ where: { id: legalMemberGuardianId } });
    expect(guardian).not.toBeNull(); // sigue existiendo, solo se marcó la baja
  });

  it("endMembership falla si ya está de baja", async () => {
    await expect(endMembership(ampaId, { guardianId: legalMemberGuardianId })).rejects.toThrow(
      "Este/a socio/a ya está de baja",
    );
  });

  it("endMembership falla para un guardian de otra AMPA", async () => {
    const otherGuardian = await prisma.guardian.findFirst({ where: { name: "Socio Ajeno" } });
    await expect(endMembership(ampaId, { guardianId: otherGuardian!.id })).rejects.toThrow(
      "Socio/a no encontrado/a para esta AMPA",
    );
  });

  it("addContactToFamily añade un contacto sin marcarlo como socio/a", async () => {
    const result = await addContactToFamily(ampaId, familyId, {
      name: "Persona de Contacto",
      email: "contacto@example.com",
    });

    const contact = await prisma.guardian.findUnique({ where: { id: result.id } });
    expect(contact?.isLegalMember).toBe(false);
    expect(contact?.dni).toBeNull();

    // No debe aparecer en el libro de socios.
    const members = await listMembers(ampaId);
    expect(members.some((m) => m.guardianId === result.id)).toBe(false);
  });
});
