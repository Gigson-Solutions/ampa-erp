import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { createShiftTask, createShift, assignGuardianToShift, cancelShiftSignup, listShiftTasks } from "../src/lib/shifts";
import { withAmpaScope } from "../src/lib/tenant";

// Gestión de turnos (Fase 2, renombrada de "voluntariado por turnos",
// 2026-08-11) — primera vez en el proyecto que una inscripción se liga
// directamente a un `Guardian` en vez de a un `Family`/`Student`.

describe("gestión de turnos: capacidad, lista de espera y aislamiento (Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let familyId: string;
  let guardianAId: string;
  let guardianBId: string;
  let guardianCId: string;
  let otherAmpaGuardianId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-SHIFTS" },
      update: {},
      create: { name: "Test Center Shifts", code: "TEST-CENTER-SHIFTS" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-shifts" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Shifts", subdomain: "test-ampa-shifts" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-shifts-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Shifts Other", subdomain: "test-ampa-shifts-other" },
    });
    otherAmpaId = otherAmpa.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "SHIFTS-0001" } });
    familyId = family.id;

    const guardianA = await prisma.guardian.create({ data: { familyId, name: "Tutor A", email: "tutora@example.com" } });
    const guardianB = await prisma.guardian.create({ data: { familyId, name: "Tutor B", email: "tutorb@example.com" } });
    const guardianC = await prisma.guardian.create({ data: { familyId, name: "Tutor C", email: "tutorc@example.com" } });
    guardianAId = guardianA.id;
    guardianBId = guardianB.id;
    guardianCId = guardianC.id;

    const otherFamily = await prisma.family.create({ data: { ampaId: otherAmpaId, referenceCode: "SHIFTS-OTHER-0001" } });
    const otherGuardian = await prisma.guardian.create({
      data: { familyId: otherFamily.id, name: "Tutor Ajeno", email: "ajeno.shifts@example.com" },
    });
    otherAmpaGuardianId = otherGuardian.id;
  });

  afterAll(async () => {
    await prisma.shiftSignup.deleteMany({ where: { shift: { task: { ampaId: { in: [ampaId, otherAmpaId] } } } } });
    await prisma.shift.deleteMany({ where: { task: { ampaId: { in: [ampaId, otherAmpaId] } } } });
    await prisma.shiftTask.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-SHIFTS" } });
    await prisma.$disconnect();
  });

  async function createTaskAndShift(capacity?: number): Promise<{ taskId: string; shiftId: string }> {
    const { id: taskId } = await createShiftTask(ampaId, { name: "Barra de la fiesta" });
    const { id: shiftId } = await createShift(ampaId, {
      taskId,
      startsAt: new Date("2027-06-20T10:00:00Z"),
      endsAt: new Date("2027-06-20T13:00:00Z"),
      location: "Patio del cole",
      capacity,
    });
    return { taskId, shiftId };
  }

  it("asigna con plazas libres (SIGNED_UP)", async () => {
    const { shiftId } = await createTaskAndShift(1);
    const result = await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianAId });
    expect(result.status).toBe("SIGNED_UP");
  });

  it("pone en lista de espera cuando no quedan plazas", async () => {
    const { shiftId } = await createTaskAndShift(1);

    const first = await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianAId });
    const second = await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianBId });

    expect(first.status).toBe("SIGNED_UP");
    expect(second.status).toBe("WAITLISTED");
  });

  it("promociona a la primera persona de la lista de espera al cancelar una asignación", async () => {
    const { shiftId } = await createTaskAndShift(1);

    const first = await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianAId });
    const second = await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianBId });
    expect(first.status).toBe("SIGNED_UP");
    expect(second.status).toBe("WAITLISTED");

    await cancelShiftSignup(ampaId, { signupId: first.signupId });

    const promoted = await prisma.shiftSignup.findUnique({ where: { id: second.signupId } });
    expect(promoted?.status).toBe("SIGNED_UP");
  });

  it("sin límite de plazas (capacity null) siempre asigna (SIGNED_UP)", async () => {
    const { shiftId } = await createTaskAndShift(undefined);
    const result = await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianCId });
    expect(result.status).toBe("SIGNED_UP");
  });

  it("no permite asignar dos veces a la misma persona en el mismo turno", async () => {
    const { shiftId } = await createTaskAndShift();
    await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianAId });
    await expect(assignGuardianToShift(ampaId, { shiftId, guardianId: guardianAId })).rejects.toThrow();
  });

  it("no permite asignar a una persona de otra AMPA (aislamiento multi-tenant)", async () => {
    const { shiftId } = await createTaskAndShift();
    await expect(
      assignGuardianToShift(ampaId, { shiftId, guardianId: otherAmpaGuardianId }),
    ).rejects.toThrow("Persona no encontrada para esta AMPA");
  });

  it("createShift falla para una tarea de otra AMPA", async () => {
    const { id: taskId } = await createShiftTask(ampaId, { name: "Tarea Test" });
    await expect(
      createShift(otherAmpaId, {
        taskId,
        startsAt: new Date(),
        endsAt: new Date(),
        location: "X",
      }),
    ).rejects.toThrow("Tarea de turno no encontrada para esta AMPA");
  });

  it("listShiftTasks no filtra datos de otra AMPA y agrega bien ocupación/lista de espera", async () => {
    const { shiftId } = await createTaskAndShift(1);
    await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianAId });
    await assignGuardianToShift(ampaId, { shiftId, guardianId: guardianBId });

    const tasks = await listShiftTasks(ampaId);
    const shift = tasks.flatMap((t) => t.shifts).find((s) => s.id === shiftId);
    expect(shift?.signedUpCount).toBe(1);
    expect(shift?.waitlistedCount).toBe(1);

    const tasksFromOtherAmpa = await withAmpaScope(otherAmpaId, (db) => db.shiftTask.findMany());
    expect(tasksFromOtherAmpa.every((t) => t.ampaId === otherAmpaId)).toBe(true);
  });
});
