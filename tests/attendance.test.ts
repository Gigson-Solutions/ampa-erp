import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createActivity, enrollStudentInActivity } from "../src/lib/activities";
import { listAttendanceForDate, recordAttendance } from "../src/lib/attendance";

describe("asistencia de extraescolares (Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let academicYearId: string;
  let activityId: string;
  let enrolledEnrollmentId: string;
  let waitlistedEnrollmentId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-ATTENDANCE" },
      update: {},
      create: { name: "Test Center Attendance", code: "TEST-CENTER-ATTENDANCE" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-attendance" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Attendance", subdomain: "test-ampa-attendance" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-attendance-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Attendance Other", subdomain: "test-ampa-attendance-other" },
    });
    otherAmpaId = otherAmpa.id;

    const academicYear = await prisma.academicYear.upsert({
      where: { ampaId_label: { ampaId, label: "2026-2027" } },
      update: {},
      create: {
        ampaId,
        label: "2026-2027",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-06-30"),
        isActive: true,
      },
    });
    academicYearId = academicYear.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "ATT-TEST-0001" } });
    const studentA = await prisma.student.create({ data: { familyId: family.id, name: "Alumno Asistencia A" } });
    const studentB = await prisma.student.create({ data: { familyId: family.id, name: "Alumno Asistencia B" } });

    const activity = await createActivity(ampaId, { name: "Natación", academicYearId, capacity: 1, price: 10 });
    activityId = activity.id;

    const enrolled = await enrollStudentInActivity(ampaId, { activityId, studentId: studentA.id });
    enrolledEnrollmentId = enrolled.enrollmentId;

    const waitlisted = await enrollStudentInActivity(ampaId, { activityId, studentId: studentB.id });
    waitlistedEnrollmentId = waitlisted.enrollmentId;
  });

  afterAll(async () => {
    await prisma.attendanceRecord.deleteMany({ where: { enrollment: { activity: { ampaId: { in: [ampaId, otherAmpaId] } } } } });
    await prisma.activityEnrollment.deleteMany({ where: { activity: { ampaId: { in: [ampaId, otherAmpaId] } } } });
    await prisma.activity.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.student.deleteMany({ where: { family: { ampaId: { in: [ampaId, otherAmpaId] } } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.academicYear.deleteMany({ where: { ampaId } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-ATTENDANCE" } });
    await prisma.$disconnect();
  });

  it("registra la asistencia y aparece en el listado del día", async () => {
    const date = new Date("2026-10-05");
    await recordAttendance(ampaId, { enrollmentId: enrolledEnrollmentId, date, present: true });

    const roster = await listAttendanceForDate(ampaId, { activityId, date });
    const entry = roster.find((r) => r.enrollmentId === enrolledEnrollmentId);
    expect(entry?.present).toBe(true);
  });

  it("corrige el registro si se marca de nuevo el mismo día (upsert, no duplica)", async () => {
    const date = new Date("2026-10-06");
    await recordAttendance(ampaId, { enrollmentId: enrolledEnrollmentId, date, present: true });
    await recordAttendance(ampaId, { enrollmentId: enrolledEnrollmentId, date, present: false });

    const roster = await listAttendanceForDate(ampaId, { activityId, date });
    const entry = roster.find((r) => r.enrollmentId === enrolledEnrollmentId);
    expect(entry?.present).toBe(false);

    const records = await prisma.attendanceRecord.findMany({ where: { enrollmentId: enrolledEnrollmentId, date } });
    expect(records).toHaveLength(1);
  });

  it("un día sin registrar aparece como null (no como ausente)", async () => {
    const roster = await listAttendanceForDate(ampaId, { activityId, date: new Date("2026-12-25") });
    const entry = roster.find((r) => r.enrollmentId === enrolledEnrollmentId);
    expect(entry?.present).toBeNull();
  });

  it("no permite pasar lista a una inscripción en lista de espera", async () => {
    await expect(
      recordAttendance(ampaId, { enrollmentId: waitlistedEnrollmentId, date: new Date(), present: true }),
    ).rejects.toThrow();
  });

  it("el roster del día solo incluye inscripciones ENROLLED, no las en espera", async () => {
    const roster = await listAttendanceForDate(ampaId, { activityId, date: new Date("2026-10-05") });
    expect(roster.some((r) => r.enrollmentId === waitlistedEnrollmentId)).toBe(false);
  });

  it("falla al pasar lista si la inscripción no existe (o no es de esta AMPA)", async () => {
    await expect(
      recordAttendance(ampaId, { enrollmentId: "non-existent-id", date: new Date(), present: true }),
    ).rejects.toThrow();
  });

  it("no permite ver el roster de una actividad de otra AMPA (aislamiento multi-tenant)", async () => {
    const roster = await listAttendanceForDate(otherAmpaId, { activityId, date: new Date("2026-10-05") });
    expect(roster).toHaveLength(0);
  });
});
