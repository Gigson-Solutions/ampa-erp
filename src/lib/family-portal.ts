import { withAmpaScope } from "./tenant";

// Portal de familias (Feedback #5, 2026-08-11) — cierra un hueco reservado
// desde Fase 0: `Guardian.userId`, `AmpaRole.FAMILIA` y el permiso
// `VIEW_OWN_FAMILY` (en authz.ts) existían desde el principio y nunca se
// habían usado. Acceso por invitación (mismo patrón que monitores/superadmins
// de plataforma) — nunca autodescubrimiento por email. Alcance v1: solo
// lectura (ver hijos/as, cuotas, actividades/eventos), nada de autoservicio de
// inscripción o pago online todavía.

export interface FamilyPortalChild {
  id: string;
  name: string;
  birthDate: Date | null;
}

export interface FamilyPortalCharge {
  id: string;
  concept: string;
  amount: number;
  dueDate: Date;
  status: string;
}

export interface FamilyPortalActivity {
  activityId: string;
  activityName: string;
  studentName: string;
  status: string;
}

export interface FamilyPortalEvent {
  eventId: string;
  eventName: string;
  eventDate: Date;
  attendeeCount: number;
  status: string;
}

export interface FamilyPortalOverview {
  familyId: string;
  referenceCode: string;
  cardToken: string | null;
  children: FamilyPortalChild[];
  charges: FamilyPortalCharge[];
  activities: FamilyPortalActivity[];
  events: FamilyPortalEvent[];
}

/**
 * Resuelve la familia del tutor/a logueado (`Guardian.userId === userId`
 * dentro de esta AMPA) y devuelve SOLO los datos de esa familia — nunca la
 * lista completa como hace el panel de junta. Devuelve `null` si este usuario
 * no está enlazado a ninguna familia de esta AMPA (no debería pasar si tiene
 * el rol `FAMILIA`, pero se comprueba de todos modos en vez de asumir).
 */
export async function getMyFamilyOverview(ampaId: string, userId: string): Promise<FamilyPortalOverview | null> {
  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    // `Guardian` no lleva `ampaId` propio — el filtro por AMPA hay que ponerlo
    // a mano vía la relación con `Family` (mismo criterio ya aplicado en
    // src/lib/members.ts).
    const guardian = await db.guardian.findFirst({
      where: { userId, family: { ampaId: scopedAmpaId } },
    });
    if (!guardian) return null;

    const family = await db.family.findUnique({
      where: { id: guardian.familyId },
      include: { students: true, charges: { orderBy: { dueDate: "asc" } } },
    });
    if (!family) return null;

    const studentIds = family.students.map((student) => student.id);

    const enrollments =
      studentIds.length === 0
        ? []
        : await db.activityEnrollment.findMany({
            where: { studentId: { in: studentIds }, status: { not: "CANCELLED" } },
            include: { activity: true, student: true },
          });

    const eventRegistrations = await db.eventRegistration.findMany({
      where: { familyId: family.id, status: { not: "CANCELLED" } },
      include: { event: true },
    });

    return {
      familyId: family.id,
      referenceCode: family.referenceCode,
      cardToken: family.cardToken,
      children: family.students.map((student) => ({
        id: student.id,
        name: student.name,
        birthDate: student.birthDate,
      })),
      charges: family.charges.map((charge) => ({
        id: charge.id,
        concept: charge.concept,
        amount: charge.amount.toNumber(),
        dueDate: charge.dueDate,
        status: charge.status,
      })),
      activities: enrollments.map((enrollment) => ({
        activityId: enrollment.activityId,
        activityName: enrollment.activity.name,
        studentName: enrollment.student.name,
        status: enrollment.status,
      })),
      events: eventRegistrations.map((registration) => ({
        eventId: registration.eventId,
        eventName: registration.event.name,
        eventDate: registration.event.date,
        attendeeCount: registration.attendeeCount,
        status: registration.status,
      })),
    };
  });
}

/**
 * Invita a un tutor/a al portal de familias: crea/reutiliza el `User` por
 * email, lo enlaza al `Guardian` (`userId`), y le da el rol `FAMILIA` para
 * esta AMPA. NO envía el email — eso lo dispara el cliente con
 * `signIn("nodemailer", ...)` justo después, reutilizando el mismo mecanismo
 * de magic link que ya usa el resto de la app (ver LoginForm.tsx).
 */
export async function inviteGuardianToPortal(ampaId: string, guardianId: string): Promise<{ email: string }> {
  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const guardian = await db.guardian.findUnique({
      where: { id: guardianId },
      include: { family: true },
    });
    // `guardian.family` puede llegar `null` en tiempo de ejecución para un
    // `Guardian` de otra AMPA (ver lección documentada en src/lib/members.ts).
    if (!guardian || !guardian.family || guardian.family.ampaId !== scopedAmpaId) {
      throw new Error("Tutor/a no encontrado/a para esta AMPA");
    }

    // `User` no está en TENANT_SCOPED_MODELS (es una tabla global) pero se usa
    // igualmente el cliente `db` de esta transacción, no el cliente base — así
    // el alta del usuario, el enlace del tutor y el rol quedan todos en la
    // misma transacción (atómico), en vez de mezclar dos conexiones distintas.
    const user = await db.user.upsert({
      where: { email: guardian.email },
      update: {},
      create: { email: guardian.email, name: guardian.name },
    });

    await db.guardian.update({ where: { id: guardian.id }, data: { userId: user.id } });

    await db.userAmpaRole.upsert({
      where: { userId_ampaId_role: { userId: user.id, ampaId: scopedAmpaId, role: "FAMILIA" } },
      update: {},
      create: { userId: user.id, ampaId: scopedAmpaId, role: "FAMILIA" },
    });

    return { email: guardian.email };
  });
}
