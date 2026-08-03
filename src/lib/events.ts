import { z } from "zod";
import { withAmpaScope } from "./tenant";

// Fase 1 (ver roadmap): "eventos con aforo y cobro". A diferencia de las
// actividades extraescolares (por alumno/a), la inscripción a un evento es por
// FAMILIA (fiestas, excursiones...) con un número de asistentes, ya que así lo
// describe el plan de visión ("Evento → Inscripción").

export const createEventSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  date: z.coerce.date(),
  capacity: z.number().int().positive().optional(),
  price: z.number().min(0).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export async function createEvent(ampaId: string, input: CreateEventInput): Promise<{ id: string }> {
  const parsed = createEventSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const event = await db.event.create({
      data: {
        ampaId: scopedAmpaId,
        name: parsed.name,
        date: parsed.date,
        capacity: parsed.capacity,
        price: parsed.price,
      },
    });
    return { id: event.id };
  });
}

export const registerFamilyForEventSchema = z.object({
  eventId: z.string().min(1),
  familyId: z.string().min(1),
  attendeeCount: z.number().int().positive().default(1),
});

export type RegisterFamilyForEventInput = z.infer<typeof registerFamilyForEventSchema>;
export type EventRegistrationStatus = "REGISTERED" | "WAITLISTED";

export interface RegisterFamilyForEventResult {
  registrationId: string;
  status: EventRegistrationStatus;
  chargeId?: string;
}

/**
 * Inscribe a una familia en un evento con su número de asistentes. Si el aforo no
 * llega para todos los asistentes solicitados, deja la inscripción en lista de
 * espera (no la rechaza) — igual criterio que `enrollStudentInActivity`. Si el
 * evento tiene precio y la inscripción queda confirmada (no en espera), genera el
 * `Charge` correspondiente (precio × nº de asistentes).
 */
export async function registerFamilyForEvent(
  ampaId: string,
  input: RegisterFamilyForEventInput,
): Promise<RegisterFamilyForEventResult> {
  const parsed = registerFamilyForEventSchema.parse(input);

  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    // Event y Family SÍ llevan `ampaId` propio (están en TENANT_SCOPED_MODELS), así
    // que si pertenecieran a otra AMPA estas queries ya devolverían null — no hace
    // falta una verificación manual adicional como en activities.ts.
    const event = await db.event.findUnique({ where: { id: parsed.eventId } });
    if (!event) throw new Error("Evento no encontrado para esta AMPA");

    const family = await db.family.findUnique({ where: { id: parsed.familyId } });
    if (!family) throw new Error("Familia no encontrada para esta AMPA");

    const existing = await db.eventRegistration.findUnique({
      where: { eventId_familyId: { eventId: event.id, familyId: family.id } },
    });
    if (existing && existing.status !== "CANCELLED") {
      throw new Error("Esta familia ya está inscrita en este evento");
    }

    await db.$queryRaw`SELECT id FROM events WHERE id = ${event.id} FOR UPDATE`;

    const currentAttendance = await db.eventRegistration.aggregate({
      where: { eventId: event.id, status: "REGISTERED" },
      _sum: { attendeeCount: true },
    });
    const totalAfterThis = (currentAttendance._sum.attendeeCount ?? 0) + parsed.attendeeCount;

    const status: EventRegistrationStatus =
      event.capacity !== null && totalAfterThis > event.capacity ? "WAITLISTED" : "REGISTERED";

    const registration = existing
      ? await db.eventRegistration.update({
          where: { id: existing.id },
          data: { status, attendeeCount: parsed.attendeeCount },
        })
      : await db.eventRegistration.create({
          data: { eventId: event.id, familyId: family.id, attendeeCount: parsed.attendeeCount, status },
        });

    let chargeId: string | undefined;
    if (status === "REGISTERED" && event.price !== null && event.price.toNumber() > 0) {
      const charge = await db.charge.create({
        data: {
          ampaId: scopedAmpaId,
          familyId: family.id,
          concept: `Evento: ${event.name}`,
          amount: event.price.toNumber() * parsed.attendeeCount,
          dueDate: event.date,
          status: "PENDING",
        },
      });
      chargeId = charge.id;
    }

    return { registrationId: registration.id, status, chargeId };
  });
}

export const cancelEventRegistrationSchema = z.object({ registrationId: z.string().min(1) });

/**
 * Cancela una inscripción a un evento y, si estaba `REGISTERED` (liberando aforo),
 * promociona automáticamente a la primera familia en lista de espera cuyo nº de
 * asistentes quepa ahora en el aforo libre (no necesariamente la primera de la
 * cola si no cabe — se recorre en orden FIFO hasta encontrar una que quepa).
 */
export async function cancelEventRegistration(
  ampaId: string,
  input: { registrationId: string },
): Promise<void> {
  const parsed = cancelEventRegistrationSchema.parse(input);

  await withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const registration = await db.eventRegistration.findUnique({
      where: { id: parsed.registrationId },
      include: { event: true },
    });
    if (!registration || registration.event.ampaId !== scopedAmpaId) {
      throw new Error("Inscripción no encontrada para esta AMPA");
    }
    if (registration.status === "CANCELLED") return;

    await db.$queryRaw`SELECT id FROM events WHERE id = ${registration.eventId} FOR UPDATE`;

    const wasRegistered = registration.status === "REGISTERED";

    await db.eventRegistration.update({ where: { id: registration.id }, data: { status: "CANCELLED" } });

    if (wasRegistered && registration.event.capacity !== null) {
      const currentAttendance = await db.eventRegistration.aggregate({
        where: { eventId: registration.eventId, status: "REGISTERED" },
        _sum: { attendeeCount: true },
      });
      const freeSpots = registration.event.capacity - (currentAttendance._sum.attendeeCount ?? 0);

      if (freeSpots > 0) {
        const waitlisted = await db.eventRegistration.findMany({
          where: { eventId: registration.eventId, status: "WAITLISTED" },
          orderBy: { createdAt: "asc" },
        });
        const nextThatFits = waitlisted.find((candidate) => candidate.attendeeCount <= freeSpots);
        if (nextThatFits) {
          await db.eventRegistration.update({
            where: { id: nextThatFits.id },
            data: { status: "REGISTERED" },
          });
        }
      }
    }
  });
}
