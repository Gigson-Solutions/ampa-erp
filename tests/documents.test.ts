import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createDocument, createDocumentSchema, listDocuments } from "../src/lib/documents";

describe("createDocumentSchema", () => {
  it("rechaza un documento sin título", () => {
    const result = createDocumentSchema.safeParse({ title: "", url: "https://example.com/doc.pdf" });
    expect(result.success).toBe(false);
  });

  it("rechaza una URL no válida", () => {
    const result = createDocumentSchema.safeParse({ title: "Estatutos", url: "no-es-una-url" });
    expect(result.success).toBe(false);
  });

  it("acepta un documento válido sin categoría", () => {
    const result = createDocumentSchema.safeParse({ title: "Estatutos", url: "https://example.com/estatutos.pdf" });
    expect(result.success).toBe(true);
  });
});

describe("documents (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-DOCUMENTS" },
      update: {},
      create: { name: "Test Center Documents", code: "TEST-CENTER-DOCUMENTS" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-documents" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Documents", subdomain: "test-ampa-documents" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-documents-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Documents Other", subdomain: "test-ampa-documents-other" },
    });
    otherAmpaId = otherAmpa.id;
  });

  afterAll(async () => {
    await prisma.document.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-DOCUMENTS" } });
    await prisma.$disconnect();
  });

  it("crea el documento y aparece en el listado", async () => {
    await createDocument(ampaId, { title: "Estatutos del AMPA", url: "https://example.com/estatutos.pdf" });

    const documents = await listDocuments(ampaId);
    expect(documents).toHaveLength(1);
    expect(documents[0]?.title).toBe("Estatutos del AMPA");
    expect(documents[0]?.category).toBeNull();
  });

  it("guarda la categoría cuando se indica", async () => {
    await createDocument(ampaId, {
      title: "Acta de la asamblea",
      url: "https://example.com/acta.pdf",
      category: "Actas",
    });

    const documents = await listDocuments(ampaId);
    const acta = documents.find((d) => d.title === "Acta de la asamblea");
    expect(acta?.category).toBe("Actas");
  });

  it("no filtra documentos de otra AMPA (aislamiento multi-tenant)", async () => {
    await createDocument(otherAmpaId, { title: "Documento ajeno", url: "https://example.com/ajeno.pdf" });

    const documentsFromThisAmpa = await listDocuments(ampaId);
    expect(documentsFromThisAmpa.some((d) => d.title === "Documento ajeno")).toBe(false);

    const documentsFromOtherAmpa = await listDocuments(otherAmpaId);
    expect(documentsFromOtherAmpa.some((d) => d.title === "Documento ajeno")).toBe(true);
  });
});
