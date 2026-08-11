import { withAmpaScope } from "./tenant";

// Listados de solo lectura para el backoffice de junta — alimentan tanto tablas
// (families/page.tsx) como los selectores del formulario de alta de membresía
// (memberships/page.tsx), que hasta ahora pedían IDs en texto plano.

export interface FamilySummary {
  id: string;
  referenceCode: string;
  guardianNames: string[];
  studentCount: number;
  createdAt: Date;
}

export async function listFamilies(ampaId: string): Promise<FamilySummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const families = await db.family.findMany({
      include: { guardians: true, students: true },
      orderBy: { createdAt: "desc" },
    });

    return families.map((family) => ({
      id: family.id,
      referenceCode: family.referenceCode,
      guardianNames: family.guardians.map((guardian) => guardian.name),
      studentCount: family.students.length,
      createdAt: family.createdAt,
    }));
  });
}

export interface FeeSchemaSummary {
  id: string;
  name: string;
  amount: number;
  academicYearId: string;
  academicYearLabel: string;
}

export async function listFeeSchemas(ampaId: string): Promise<FeeSchemaSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const feeSchemas = await db.feeSchema.findMany({
      include: { academicYear: true },
      orderBy: { createdAt: "desc" },
    });

    return feeSchemas.map((feeSchema) => ({
      id: feeSchema.id,
      name: feeSchema.name,
      amount: feeSchema.amount.toNumber(),
      academicYearId: feeSchema.academicYearId,
      academicYearLabel: feeSchema.academicYear.label,
    }));
  });
}

export interface PendingChargeSummary {
  id: string;
  familyId: string;
  familyReferenceCode: string;
  // Antes solo se mostraba `familyReferenceCode` (p.ej. "F-E9AC124E") en el
  // listado de cargos, que no le dice nada a tesorería sin buscar la familia por
  // separado — se añade el nombre de los tutores, igual que ya hace `listFamilies`.
  familyGuardianNames: string[];
  concept: string;
  amount: number;
  dueDate: Date;
  status: string;
}

export async function listPendingCharges(ampaId: string): Promise<PendingChargeSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const charges = await db.charge.findMany({
      where: { status: { in: ["PENDING", "OVERDUE"] } },
      include: { family: { include: { guardians: true } } },
      orderBy: { dueDate: "asc" },
    });

    return charges.map((charge) => ({
      id: charge.id,
      familyId: charge.familyId,
      familyReferenceCode: charge.family.referenceCode,
      familyGuardianNames: charge.family.guardians.map((guardian) => guardian.name),
      concept: charge.concept,
      amount: charge.amount.toNumber(),
      dueDate: charge.dueDate,
      status: charge.status,
    }));
  });
}

export interface AcademicYearSummary {
  id: string;
  label: string;
  isActive: boolean;
}

export async function listAcademicYears(ampaId: string): Promise<AcademicYearSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const years = await db.academicYear.findMany({ orderBy: { startDate: "desc" } });
    return years.map((year) => ({ id: year.id, label: year.label, isActive: year.isActive }));
  });
}

export interface StudentSummary {
  id: string;
  name: string;
  familyReferenceCode: string;
}

export async function listStudents(ampaId: string): Promise<StudentSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const families = await db.family.findMany({ include: { students: true } });
    return families.flatMap((family) =>
      family.students.map((student) => ({
        id: student.id,
        name: student.name,
        familyReferenceCode: family.referenceCode,
      })),
    );
  });
}

export interface ActivitySummary {
  id: string;
  name: string;
  academicYearLabel: string;
  providerName: string | null;
  capacity: number | null;
  price: number;
  enrolledCount: number;
  waitlistedCount: number;
}

export interface ActivityEnrollmentSummary {
  id: string;
  studentName: string;
  familyReferenceCode: string;
  status: string;
}

export async function listActivities(ampaId: string): Promise<ActivitySummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const activities = await db.activity.findMany({
      include: { academicYear: true, provider: true, enrollments: true },
      orderBy: { createdAt: "desc" },
    });

    return activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      academicYearLabel: activity.academicYear.label,
      providerName: activity.provider?.name ?? null,
      capacity: activity.capacity,
      price: activity.price.toNumber(),
      enrolledCount: activity.enrollments.filter((e) => e.status === "ENROLLED").length,
      waitlistedCount: activity.enrollments.filter((e) => e.status === "WAITLISTED").length,
    }));
  });
}

export async function listActivityEnrollments(
  ampaId: string,
  activityId: string,
): Promise<ActivityEnrollmentSummary[]> {
  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const activity = await db.activity.findUnique({ where: { id: activityId } });
    if (!activity || activity.ampaId !== scopedAmpaId) return [];

    const enrollments = await db.activityEnrollment.findMany({
      where: { activityId, status: { not: "CANCELLED" } },
      include: { student: { include: { family: true } } },
      orderBy: { createdAt: "asc" },
    });

    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      studentName: enrollment.student.name,
      familyReferenceCode: enrollment.student.family.referenceCode,
      status: enrollment.status,
    }));
  });
}

export interface EventSummary {
  id: string;
  name: string;
  date: Date;
  capacity: number | null;
  price: number | null;
  registeredAttendees: number;
  waitlistedCount: number;
}

export interface EventRegistrationSummary {
  id: string;
  familyReferenceCode: string;
  attendeeCount: number;
  status: string;
}

export async function listEvents(ampaId: string): Promise<EventSummary[]> {
  return withAmpaScope(ampaId, async (db) => {
    const events = await db.event.findMany({
      include: { registrations: true },
      orderBy: { date: "asc" },
    });

    return events.map((event) => ({
      id: event.id,
      name: event.name,
      date: event.date,
      capacity: event.capacity,
      price: event.price?.toNumber() ?? null,
      registeredAttendees: event.registrations
        .filter((r) => r.status === "REGISTERED")
        .reduce((sum, r) => sum + r.attendeeCount, 0),
      waitlistedCount: event.registrations.filter((r) => r.status === "WAITLISTED").length,
    }));
  });
}

export async function listEventRegistrations(
  ampaId: string,
  eventId: string,
): Promise<EventRegistrationSummary[]> {
  return withAmpaScope(ampaId, async (db, scopedAmpaId) => {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.ampaId !== scopedAmpaId) return [];

    const registrations = await db.eventRegistration.findMany({
      where: { eventId, status: { not: "CANCELLED" } },
      include: { family: true },
      orderBy: { createdAt: "asc" },
    });

    return registrations.map((registration) => ({
      id: registration.id,
      familyReferenceCode: registration.family.referenceCode,
      attendeeCount: registration.attendeeCount,
      status: registration.status,
    }));
  });
}
