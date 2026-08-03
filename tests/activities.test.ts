import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { cancelEnrollment, createActivity, enrollStudentInActivity } from "../src/lib/activities";
import { withAmpaScope } from "../src/lib/tenant";

describe("extraescolares: plazas, lista de espera y aislamiento (Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let academicYearId: string;
  let familyId: string;
  let studentAId: string;
  let studentBId: string;
  let studentCId: string;
  let otherAmpaStudentId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-ACTIVITIES" },
      update: {},
      create: { name: "Test Center Activities", code: "TEST-CENTER-ACTIVITIES" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-activities" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Activities", subdomain: "test-ampa-activities" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-activities-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Activities Other", subdomain: "test-ampa-activities-other" },
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

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "ACT-TEST-0001" } });
    familyId = family.id;

    const studentA = await prisma.student.create({ data: { familyId, name: "Alumno A" } });
    const studentB = await prisma.student.create({ data: { familyId, name: "Alumno B" } });
    const studentC = await prisma.student.create({ data: { familyId, name: "Alumno C" } });
    studentAId = studentA.id;
    studentBId = studentB.id;
    studentCId = studentC.id;

    const otherCenter = await prisma.center.upsert({
      where: { code: "TEST-CENTER-ACTIVITIES-OTHER" },
      update: {},
      create: { name: "Other Center", code: "TEST-CENTER-ACTIVITIES-OTHER" },
    });
    const otherFamily = await prisma.family.create({
      data: { ampaId: otherAmpaId, referenceCode: "ACT-OTHER-0001" },
    });
    const otherStudent = await prisma.student.create({ data: { familyId: otherFamily.id, name: "Alumno Ajeno" } });
    otherAmpaStudentId = otherStudent.id;
    void otherCenter;
  });

  afterAll(async () => {
    await prisma.activityEnrollment.deleteMany({
      where: { activity: { ampaId: { in: [ampaId, otherAmpaId] } } },
    });
    await prisma.activity.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.student.deleteMany({ where: { family: { ampaId: { in: [ampaId, otherAmpaId] } } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.academicYear.deleteMany({ where: { ampaId } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: { in: ["TEST-CENTER-ACTIVITIES", "TEST-CENTER-ACTIVITIES-OTHER"] } } });
    await prisma.$disconnect();
  });

  it("inscribe con plazas libres (ENROLLED)", async () => {
    const { id: activityId } = await createActivity(ampaId, {
      name: "Ajedrez",
      academicYearId,
      capacity: 1,
      price: 20,
    });

    const result = await enrollStudentInActivity(ampaId, { activityId, studentId: studentAId });
    expect(result.status).toBe("ENROLLED");
  });

  it("pone en lista de espera cuando no quedan plazas", async () => {
    const { id: activityId } = await createActivity(ampaId, {
      name: "Robótica",
      academicYearId,
      capacity: 1,
      price: 30,
    });

    const first = await enrollStudentInActivity(ampaId, { activityId, studentId: studentAId });
    expect(first.status).toBe("ENROLLED");

    const second = await enrollStudentInActivity(ampaId, { activityId, studentId: studentBId });
    expect(second.status).toBe("WAITLISTED");
  });

  it("promociona al primero de la lista de espera al cancelar una plaza", async () => {
    const { id: activityId } = await createActivity(ampaId, {
      name: "Teatro",
      academicYearId,
      capacity: 1,
      price: 15,
    });

    const first = await enrollStudentInActivity(ampaId, { activityId, studentId: studentAId });
    const second = await enrollStudentInActivity(ampaId, { activityId, studentId: studentBId });
    expect(first.status).toBe("ENROLLED");
    expect(second.status).toBe("WAITLISTED");

    await cancelEnrollment(ampaId, { enrollmentId: first.enrollmentId });

    const promoted = await prisma.activityEnrollment.findUnique({ where: { id: second.enrollmentId } });
    expect(promoted?.status).toBe("ENROLLED");
  });

  it("no permite inscribir dos veces al mismo alumno/a en la misma actividad", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Pintura", academicYearId, price: 10 });

    await enrollStudentInActivity(ampaId, { activityId, studentId: studentCId });
    await expect(enrollStudentInActivity(ampaId, { activityId, studentId: studentCId })).rejects.toThrow();
  });

  it("sin límite de plazas (capacity null) siempre inscribe (ENROLLED)", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Biblioteca", academicYearId, price: 0 });

    const result = await enrollStudentInActivity(ampaId, { activityId, studentId: studentAId });
    expect(result.status).toBe("ENROLLED");
  });

  it("no permite inscribir a un alumno/a de otra AMPA (aislamiento multi-tenant)", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Música", academicYearId, price: 10 });

    await expect(
      enrollStudentInActivity(ampaId, { activityId, studentId: otherAmpaStudentId }),
    ).rejects.toThrow();
  });

  it("no permite ver las inscripciones creadas desde otra AMPA (aislamiento multi-tenant)", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Idiomas", academicYearId, price: 25 });
    const result = await enrollStudentInActivity(ampaId, { activityId, studentId: studentAId });

    const enrollmentsFromOtherAmpa = await withAmpaScope(otherAmpaId, (db) =>
      db.activity.findMany({ where: { id: activityId } }),
    );
    expect(enrollmentsFromOtherAmpa).toHaveLength(0);
    expect(result.enrollmentId).toBeTruthy();
  });
});
