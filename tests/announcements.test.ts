import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createAnnouncement, createAnnouncementSchema, listAnnouncements } from "../src/lib/announcements";

describe("createAnnouncementSchema", () => {
  it("rechaza un comunicado sin título", () => {
    const result = createAnnouncementSchema.safeParse({ title: "", body: "Contenido" });
    expect(result.success).toBe(false);
  });

  it("rechaza un comunicado sin contenido", () => {
    const result = createAnnouncementSchema.safeParse({ title: "Aviso", body: "" });
    expect(result.success).toBe(false);
  });
});

describe("announcements (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-ANNOUNCEMENTS" },
      update: {},
      create: { name: "Test Center Announcements", code: "TEST-CENTER-ANNOUNCEMENTS" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-announcements" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Announcements", subdomain: "test-ampa-announcements" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-announcements-other" },
      update: {},
      create: {
        centerId: center.id,
        name: "Test AMPA Announcements Other",
        subdomain: "test-ampa-announcements-other",
      },
    });
    otherAmpaId = otherAmpa.id;
  });

  afterAll(async () => {
    await prisma.announcement.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-ANNOUNCEMENTS" } });
    await prisma.$disconnect();
  });

  it("crea el comunicado ya publicado (sentAt fijado) y aparece en el listado", async () => {
    await createAnnouncement(ampaId, { title: "Reunión de junta", body: "Este jueves a las 18h." });

    const announcements = await listAnnouncements(ampaId);
    expect(announcements).toHaveLength(1);
    expect(announcements[0]?.title).toBe("Reunión de junta");
    expect(announcements[0]?.sentAt).not.toBeNull();
  });

  it("los más recientes aparecen primero", async () => {
    await createAnnouncement(ampaId, { title: "Segundo aviso", body: "..." });

    const announcements = await listAnnouncements(ampaId);
    expect(announcements[0]?.title).toBe("Segundo aviso");
  });

  it("no filtra comunicados de otra AMPA (aislamiento multi-tenant)", async () => {
    await createAnnouncement(otherAmpaId, { title: "Aviso de otra AMPA", body: "..." });

    const announcementsFromThisAmpa = await listAnnouncements(ampaId);
    expect(announcementsFromThisAmpa.some((a) => a.title === "Aviso de otra AMPA")).toBe(false);

    const announcementsFromOtherAmpa = await listAnnouncements(otherAmpaId);
    expect(announcementsFromOtherAmpa.some((a) => a.title === "Aviso de otra AMPA")).toBe(true);
  });
});
