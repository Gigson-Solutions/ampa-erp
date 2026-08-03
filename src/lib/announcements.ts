import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 1 (ver roadmap): "comunicación segmentada (push + email)... tablón digital".
// Esta primera versión cubre el tablón (comunicado visible para toda la AMPA,
// publicado de inmediato) — NO implementa todavía segmentación real por curso,
// grupo, actividad, estado de pago o idioma (el campo `segment` del modelo ya
// existe para eso, pero requeriría cruzar Student.groupId / Membership por
// academicYearId, fuera de alcance de esta pieza) ni el envío push/email (eso
// vive en Fase 2 según el plan de visión — de momento solo se guarda y se lee de
// la base de datos, sin notificar activamente a nadie).

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  body: z.string().trim().min(1, "El contenido es obligatorio"),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  sentAt: Date | null;
}

export async function createAnnouncement(
  ampaId: string,
  input: CreateAnnouncementInput,
): Promise<{ id: string }> {
  const parsed = createAnnouncementSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const announcement = await db.announcement.create({
      data: {
        ampaId: scopedAmpaId,
        title: parsed.title,
        body: parsed.body,
        sentAt: new Date(),
      },
    });
    return { id: announcement.id };
  });
}

export async function listAnnouncements(ampaId: string): Promise<AnnouncementSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const announcements = await db.announcement.findMany({
      where: { sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
    });

    return announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      sentAt: announcement.sentAt,
    }));
  });
}
