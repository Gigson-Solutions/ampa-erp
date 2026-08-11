import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { listMonitors, inviteMonitor, removeMonitor, listMyMonitoredActivities } from "../src/lib/monitors";
import { createActivity, enrollStudentInActivity } from "../src/lib/activities";

// Sistema de monitores (feedback de usuario, 2026-08-11) — activa el permiso
// VIEW_OWN_ACTIVITIES (authz.ts, definido desde Fase 0, nunca usado).

describe("monitors (integración contra Postgres real)", () => {
  let ampaId: string;
  let otherAmpaId: string;
  let academicYearId: string;
  let familyId: string;
  let studentId: string;

  beforeAll(async () => {
    const center = await prisma.center.upsert({
      where: { code: "TEST-CENTER-MONITORS" },
      update: {},
      create: { name: "Test Center Monitors", code: "TEST-CENTER-MONITORS" },
    });

    const ampa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-monitors" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Monitors", subdomain: "test-ampa-monitors" },
    });
    ampaId = ampa.id;

    const otherAmpa = await prisma.ampa.upsert({
      where: { subdomain: "test-ampa-monitors-other" },
      update: {},
      create: { centerId: center.id, name: "Test AMPA Monitors Other", subdomain: "test-ampa-monitors-other" },
    });
    otherAmpaId = otherAmpa.id;

    const academicYear = await prisma.academicYear.create({
      data: {
        ampaId,
        label: "2026-2027",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-06-30"),
        isActive: true,
      },
    });
    academicYearId = academicYear.id;

    const family = await prisma.family.create({ data: { ampaId, referenceCode: "MONITORS-0001" } });
    familyId = family.id;
    const student = await prisma.student.create({ data: { familyId, name: "Alumno Monitor" } });
    studentId = student.id;
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: "monitor.test@example.com" } });
    await prisma.userAmpaRole.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.activityEnrollment.deleteMany({ where: { activity: { ampaId: { in: [ampaId, otherAmpaId] } } } });
    await prisma.activity.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.family.deleteMany({ where: { ampaId: { in: [ampaId, otherAmpaId] } } });
    await prisma.academicYear.deleteMany({ where: { ampaId } });
    await prisma.ampa.deleteMany({ where: { id: { in: [ampaId, otherAmpaId] } } });
    await prisma.center.deleteMany({ where: { code: "TEST-CENTER-MONITORS" } });
    if (user) await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it("inviteMonitor crea/enlaza el User y da el rol MONITOR", async () => {
    const result = await inviteMonitor(ampaId, { name: "Monitor de Prueba", email: "monitor.test@example.com" });
    expect(result.email).toBe("monitor.test@example.com");

    const monitors = await listMonitors(ampaId);
    expect(monitors.some((m) => m.email === "monitor.test@example.com")).toBe(true);
  });

  it("no filtra monitores de otra AMPA (aislamiento multi-tenant)", async () => {
    const monitors = await listMonitors(otherAmpaId);
    expect(monitors).toHaveLength(0);
  });

  it("listMyMonitoredActivities devuelve solo las actividades asignadas a ese monitor, con sus inscripciones", async () => {
    const monitor = await inviteMonitor(ampaId, { name: "Otro Monitor", email: "otro.monitor@example.com" });

    const { id: activityId } = await createActivity(ampaId, {
      name: "Actividad Monitorizada",
      academicYearId,
      price: 0,
    });
    await prisma.activity.update({ where: { id: activityId }, data: { monitorUserId: monitor.userId } });
    await enrollStudentInActivity(ampaId, { activityId, studentId });

    const monitored = await listMyMonitoredActivities(ampaId, monitor.userId);
    expect(monitored).toHaveLength(1);
    expect(monitored[0]?.activityName).toBe("Actividad Monitorizada");
    expect(monitored[0]?.students).toHaveLength(1);
    expect(monitored[0]?.students[0]?.studentName).toBe("Alumno Monitor");

    await prisma.user.delete({ where: { id: monitor.userId } });
  });

  it("removeMonitor quita el rol pero no borra el User", async () => {
    const monitor = await inviteMonitor(ampaId, { name: "Monitor Temporal", email: "temporal.monitor@example.com" });

    await removeMonitor(ampaId, { userId: monitor.userId });

    const monitors = await listMonitors(ampaId);
    expect(monitors.some((m) => m.userId === monitor.userId)).toBe(false);

    const user = await prisma.user.findUnique({ where: { id: monitor.userId } });
    expect(user).not.toBeNull();

    await prisma.user.delete({ where: { id: monitor.userId } });
  });

  it("removeMonitor falla si la persona no es monitor de esta AMPA", async () => {
    await expect(removeMonitor(ampaId, { userId: "non-existent-user-id" })).rejects.toThrow(
      "Este usuario no es monitor de esta AMPA",
    );
  });
});
