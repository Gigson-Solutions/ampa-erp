import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  cancelEnrollment,
  createActivity,
  enrollStudentInActivity,
  updateActivity,
  deleteActivity,
} from "../src/lib/activities";
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
    await prisma.charge.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
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

  // Pago fraccionado (feedback de usuario, 2026-08-11): hallazgo real —
  // enrollStudentInActivity nunca generaba ningún Charge a pesar de que
  // Activity.price existe desde Fase 0. Cubre el cobro único y el fraccionado.

  it("genera un único cargo al inscribir en una actividad con precio y sin plazos", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Natación", academicYearId, price: 40 });

    const result = await enrollStudentInActivity(ampaId, { activityId, studentId: studentAId });
    expect(result.status).toBe("ENROLLED");

    const charges = await prisma.charge.findMany({ where: { ampaId, familyId, concept: { contains: "Natación" } } });
    expect(charges).toHaveLength(1);
    expect(charges[0]?.amount.toNumber()).toBe(40);
  });

  it("no genera ningún cargo si la actividad es gratuita", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Lectura", academicYearId, price: 0 });

    await enrollStudentInActivity(ampaId, { activityId, studentId: studentBId });

    const charges = await prisma.charge.findMany({ where: { ampaId, familyId, concept: { contains: "Lectura" } } });
    expect(charges).toHaveLength(0);
  });

  it("genera varios cargos (plazos) cuando la actividad tiene pago fraccionado configurado", async () => {
    const { id: activityId } = await createActivity(ampaId, {
      name: "Viaje fin de curso",
      academicYearId,
      price: 300,
      installmentCount: 3,
      installmentRecurrenceDays: 30,
    });

    await enrollStudentInActivity(ampaId, { activityId, studentId: studentCId });

    const charges = await prisma.charge.findMany({
      where: { ampaId, familyId, concept: { contains: "Viaje fin de curso" } },
      orderBy: { dueDate: "asc" },
    });
    expect(charges).toHaveLength(3);
    expect(charges.every((charge) => charge.amount.toNumber() === 100)).toBe(true);
    expect(charges[0]?.concept).toContain("plazo 1/3");
    expect(charges[2]?.concept).toContain("plazo 3/3");
    const daysBetween = Math.round(
      (charges[1]!.dueDate.getTime() - charges[0]!.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(daysBetween).toBe(30);
  });

  it("genera el cargo también al promocionar desde la lista de espera", async () => {
    const { id: activityId } = await createActivity(ampaId, {
      name: "Circo",
      academicYearId,
      capacity: 1,
      price: 50,
    });

    const first = await enrollStudentInActivity(ampaId, { activityId, studentId: studentAId });
    const second = await enrollStudentInActivity(ampaId, { activityId, studentId: studentBId });
    expect(first.status).toBe("ENROLLED");
    expect(second.status).toBe("WAITLISTED");

    // Al inscribirse en lista de espera no se genera cargo todavía.
    let charges = await prisma.charge.findMany({ where: { ampaId, familyId, concept: { contains: "Circo" } } });
    expect(charges).toHaveLength(1); // solo el de studentA (ENROLLED)

    await cancelEnrollment(ampaId, { enrollmentId: first.enrollmentId });

    charges = await prisma.charge.findMany({ where: { ampaId, familyId, concept: { contains: "Circo" } } });
    expect(charges).toHaveLength(2); // ahora también el de studentB, promocionado/a
  });

  // CRUD de actividad (feedback de usuario, 2026-08-11): antes solo se podía crear.

  it("updateActivity actualiza nombre, precio, capacidad y plazos", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Original", academicYearId, price: 10 });

    await updateActivity(ampaId, activityId, {
      name: "Actualizada",
      price: 25,
      capacity: 5,
      installmentCount: 2,
      installmentRecurrenceDays: 15,
    });

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    expect(activity?.name).toBe("Actualizada");
    expect(activity?.price.toNumber()).toBe(25);
    expect(activity?.capacity).toBe(5);
    expect(activity?.installmentCount).toBe(2);
    expect(activity?.installmentRecurrenceDays).toBe(15);
  });

  it("updateActivity falla para una actividad de otra AMPA", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Ajena", academicYearId, price: 10 });

    await expect(updateActivity(otherAmpaId, activityId, { name: "Hackeada", price: 10 })).rejects.toThrow(
      "Actividad no encontrada para esta AMPA",
    );
  });

  it("deleteActivity borra una actividad sin inscripciones", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Para borrar", academicYearId, price: 5 });

    await deleteActivity(ampaId, activityId);

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    expect(activity).toBeNull();
  });

  it("deleteActivity falla si la actividad tiene inscripciones activas", async () => {
    const { id: activityId } = await createActivity(ampaId, { name: "Con inscritos", academicYearId, price: 5 });
    await enrollStudentInActivity(ampaId, { activityId, studentId: studentAId });

    await expect(deleteActivity(ampaId, activityId)).rejects.toThrow(
      "No se puede borrar una actividad con inscripciones activas",
    );
  });
});
