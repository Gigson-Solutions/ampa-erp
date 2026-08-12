import { notFound } from "next/navigation";
import { createEvents, type EventAttributes } from "ics";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ ampa: string }>;
}

// Feedback de usuario (2026-08-11): suscripción al calendario de eventos
// desde Google Calendar y Outlook/Microsoft 365 — ambos soportan "añadir
// calendario por URL" de forma nativa (se refrescan solos), así que basta con
// servir un `.ics` (RFC 5545) bien formado, sin integrarse con sus APIs.
//
// Público, sin token (confirmado por el usuario): un evento solo tiene
// nombre/fecha/aforo, sin datos personales — mismo criterio que el resto de
// contenido público de la AMPA (tablón, documentos). Solo cubre `Event`, no
// `Activity` (las extraescolares no tienen sesiones con fecha propia en el
// modelo actual).
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const { ampa: subdomain } = await params;

  const ampa = await prisma.ampa.findUnique({ where: { subdomain } });
  if (!ampa) notFound();

  const events = await prisma.event.findMany({ where: { ampaId: ampa.id }, orderBy: { date: "asc" } });

  const icsEvents: EventAttributes[] = events.map((event) => {
    const date = event.date;
    return {
      title: event.name,
      start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()],
      duration: { hours: 1 },
      calName: ampa.name,
      uid: `event-${event.id}@ampa-erp`,
    };
  });

  const { error, value } = createEvents(icsEvents, { calName: ampa.name, productId: "ampa-erp/ics" });
  if (error || !value) {
    console.error("calendar.ics generation failed:", error);
    return new Response("No se pudo generar el calendario", { status: 500 });
  }

  return new Response(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${subdomain}.ics"`,
    },
  });
}
