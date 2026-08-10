import { prisma } from "../src/lib/prisma";
import { registerFamily } from "../src/lib/family-registration";
import { createMembershipWithCharge } from "../src/lib/membership";
import { recordManualPayment } from "../src/lib/payments";
import { createActivity, enrollStudentInActivity } from "../src/lib/activities";
import { recordAttendance } from "../src/lib/attendance";
import { createEvent, registerFamilyForEvent } from "../src/lib/events";
import { createAnnouncement } from "../src/lib/announcements";
import { createDocument } from "../src/lib/documents";
import { createMinutesEntry } from "../src/lib/minutes";
import { getOrCreateFamilyCardToken } from "../src/lib/card";

// `campanar` es la AMPA "de escaparate": se puebla con datos realistas (varias
// familias, cuotas pagadas/pendientes/atrasadas, extraescolares con lista de
// espera, eventos con aforo, comunicados, documentos y libro de actas) para poder
// ver ejemplos reales de cada sección al probar la app en local. `montealto` se
// deja mínima a propósito — solo existe para el test de aislamiento multi-tenant
// (tests/tenant-isolation.test.ts), que necesita una segunda AMPA con datos
// cruzados, no un escaparate completo.
//
// Reutiliza la misma lógica de negocio que usa la app real (src/lib/*.ts) en vez
// de escribir Prisma crudo, para que los datos de ejemplo pasen por las mismas
// validaciones/reglas (prorrateo, descuentos, aforo, lista de espera, cadena de
// hashes del libro de actas...) que un uso real.

interface DemoFamilyInput {
  key: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  students: Array<{ name: string; birthDate: string }>;
  discounts: { siblingCount: number; isLargeFamily: boolean; scholarshipDiscountPercent: number };
  consents: { image: boolean; centerShare: boolean };
  enrollmentDate: Date;
  payment: "TRANSFER" | "CASH" | null;
}

async function main(): Promise<void> {
  const centerA = await prisma.center.upsert({
    where: { code: "IES-CAMPANAR" },
    update: {},
    create: { name: "IES Campanar", code: "IES-CAMPANAR" },
  });

  const centerB = await prisma.center.upsert({
    where: { code: "IES-MONTE-ALTO" },
    update: {},
    create: { name: "IES Monte Alto", code: "IES-MONTE-ALTO" },
  });

  const ampaA = await prisma.ampa.upsert({
    where: { subdomain: "campanar" },
    update: {},
    create: {
      centerId: centerA.id,
      name: "AMPA IES Campanar",
      subdomain: "campanar",
      locale: "es",
    },
  });

  const ampaB = await prisma.ampa.upsert({
    where: { subdomain: "montealto" },
    update: {},
    create: {
      centerId: centerB.id,
      name: "AMPA IES Monte Alto",
      subdomain: "montealto",
      locale: "ca",
    },
  });

  const yearA = await prisma.academicYear.upsert({
    where: { ampaId_label: { ampaId: ampaA.id, label: "2026-2027" } },
    update: {},
    create: {
      ampaId: ampaA.id,
      label: "2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });

  const yearB = await prisma.academicYear.upsert({
    where: { ampaId_label: { ampaId: ampaB.id, label: "2026-2027" } },
    update: {},
    create: {
      ampaId: ampaB.id,
      label: "2026-2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-06-30"),
      isActive: true,
    },
  });

  const familyB = await prisma.family.create({
    data: { ampaId: ampaB.id, referenceCode: "B-0001" },
  });

  await prisma.guardian.create({
    data: {
      familyId: familyB.id,
      name: "Familia de prueba B",
      email: "familia-b@example.com",
    },
  });

  const feeSchemaA = await prisma.feeSchema.upsert({
    where: { id: "seed-fee-schema-a" },
    update: {},
    create: {
      id: "seed-fee-schema-a",
      ampaId: ampaA.id,
      academicYearId: yearA.id,
      name: "Cuota estándar",
      amount: 100,
      discountRules: { siblingDiscountPercent: 10, largeFamilyDiscountPercent: 15 },
    },
  });

  // ─── Familias (alta + consentimientos RGPD + membresía + cuota + pago) ────────
  // Variedad deliberada: cuota completa pagada, pago en efectivo, familia numerosa
  // con cuota pendiente (aún no vencida), beca del 50%, cargo atrasado (vencido y
  // sin pagar) y alta a mitad de curso (cuota prorrateada).
  const demoFamilies: DemoFamilyInput[] = [
    {
      key: "garcia",
      guardianName: "María García Martínez",
      guardianEmail: "maria.garcia@example.com",
      guardianPhone: "611111111",
      students: [
        { name: "Lucía García", birthDate: "2012-03-15" },
        { name: "Pablo García", birthDate: "2010-06-20" },
      ],
      discounts: { siblingCount: 1, isLargeFamily: false, scholarshipDiscountPercent: 0 },
      consents: { image: true, centerShare: true },
      enrollmentDate: yearA.startDate,
      payment: "TRANSFER",
    },
    {
      key: "lopez",
      guardianName: "Javier López Fernández",
      guardianEmail: "javier.lopez@example.com",
      guardianPhone: "622222222",
      students: [{ name: "Sofía López", birthDate: "2011-09-10" }],
      discounts: { siblingCount: 0, isLargeFamily: false, scholarshipDiscountPercent: 0 },
      consents: { image: true, centerShare: false },
      enrollmentDate: yearA.startDate,
      payment: "CASH",
    },
    {
      key: "ruiz",
      guardianName: "Ana Ruiz Sánchez",
      guardianEmail: "ana.ruiz@example.com",
      guardianPhone: "633333333",
      students: [
        { name: "Diego Ruiz", birthDate: "2009-01-05" },
        { name: "Marta Ruiz", birthDate: "2013-04-22" },
        { name: "Álvaro Ruiz", birthDate: "2015-11-30" },
      ],
      discounts: { siblingCount: 2, isLargeFamily: true, scholarshipDiscountPercent: 0 },
      consents: { image: false, centerShare: true },
      enrollmentDate: yearA.startDate,
      payment: null, // pendiente, todavía no vencida (demo de "cargo pendiente")
    },
    {
      key: "torres",
      guardianName: "Elena Torres Gómez",
      guardianEmail: "elena.torres@example.com",
      guardianPhone: "644444444",
      students: [{ name: "Hugo Torres", birthDate: "2012-08-01" }],
      discounts: { siblingCount: 0, isLargeFamily: false, scholarshipDiscountPercent: 50 },
      consents: { image: true, centerShare: true },
      enrollmentDate: yearA.startDate,
      payment: "TRANSFER",
    },
    {
      key: "moreno",
      guardianName: "David Moreno Díaz",
      guardianEmail: "david.moreno@example.com",
      guardianPhone: "655555555",
      students: [
        { name: "Claudia Moreno", birthDate: "2011-02-14" },
        { name: "Daniela Moreno", birthDate: "2014-07-19" },
      ],
      discounts: { siblingCount: 1, isLargeFamily: false, scholarshipDiscountPercent: 0 },
      consents: { image: false, centerShare: false },
      // Anterior al inicio de curso (se prorratea a cuota completa) pero con fecha
      // de alta lo bastante atrás como para que el vencimiento (+30 días) ya haya
      // pasado — demo de cargo ATRASADO sin cobrar.
      enrollmentDate: new Date("2026-07-01"),
      payment: null,
    },
    {
      key: "jimenez",
      guardianName: "Laura Jiménez Romero",
      guardianEmail: "laura.jimenez@example.com",
      guardianPhone: "666666666",
      students: [{ name: "Marcos Jiménez", birthDate: "2010-12-03" }],
      discounts: { siblingCount: 0, isLargeFamily: false, scholarshipDiscountPercent: 0 },
      consents: { image: true, centerShare: true },
      // Alta a mitad de curso — demo de cuota PRORRATEADA (menos de 100€).
      enrollmentDate: new Date("2026-11-15"),
      payment: "TRANSFER",
    },
  ];

  const familyIdByKey = new Map<string, string>();
  const studentIdByName = new Map<string, string>();

  for (const demo of demoFamilies) {
    const { familyId } = await registerFamily(
      ampaA.id,
      {
        guardian: { name: demo.guardianName, email: demo.guardianEmail, phone: demo.guardianPhone },
        students: demo.students.map((student) => ({
          name: student.name,
          birthDate: new Date(student.birthDate),
        })),
        consents: { data: true, image: demo.consents.image, centerShare: demo.consents.centerShare },
      },
      { ip: "127.0.0.1" },
    );
    familyIdByKey.set(demo.key, familyId);

    const students = await prisma.student.findMany({ where: { familyId } });
    for (const student of students) {
      studentIdByName.set(student.name, student.id);
    }

    const { chargeId } = await createMembershipWithCharge(ampaA.id, {
      familyId,
      feeSchemaId: feeSchemaA.id,
      enrollmentDate: demo.enrollmentDate,
      familyDiscounts: demo.discounts,
    });

    if (demo.payment) {
      await recordManualPayment(ampaA.id, { chargeId, method: demo.payment });
    }
  }

  // Carnet digital con QR ya generado para un par de familias (el resto se genera
  // de forma perezosa la primera vez que se pide desde el panel de junta).
  await getOrCreateFamilyCardToken(ampaA.id, familyIdByKey.get("garcia") ?? "");
  await getOrCreateFamilyCardToken(ampaA.id, familyIdByKey.get("lopez") ?? "");

  // ─── Extraescolares: proveedores, actividades, inscripciones (con lista de
  // espera) y asistencia ────────────────────────────────────────────────────────
  const providerRobotica = await prisma.provider.create({
    data: { ampaId: ampaA.id, name: "Aula Robótica S.L.", contactEmail: "contacto@aularobotica.example.com" },
  });
  const providerBritannia = await prisma.provider.create({
    data: { ampaId: ampaA.id, name: "Academia Britannia", contactEmail: "info@academiabritannia.example.com" },
  });

  const robotica = await createActivity(ampaA.id, {
    name: "Robótica educativa",
    academicYearId: yearA.id,
    providerId: providerRobotica.id,
    capacity: 6,
    price: 25,
  });
  const ingles = await createActivity(ampaA.id, {
    name: "Inglés extraescolar",
    academicYearId: yearA.id,
    providerId: providerBritannia.id,
    capacity: 15,
    price: 30,
  });
  const baloncesto = await createActivity(ampaA.id, {
    name: "Baloncesto",
    academicYearId: yearA.id,
    capacity: 10,
    price: 15,
  });

  function studentId(name: string): string {
    const id = studentIdByName.get(name);
    if (!id) throw new Error(`Seed: alumno/a "${name}" no encontrado/a`);
    return id;
  }

  // Robótica: 6 plazas, 7 inscripciones -> la última queda en lista de espera.
  const roboticaOrder = [
    "Lucía García",
    "Pablo García",
    "Sofía López",
    "Diego Ruiz",
    "Marta Ruiz",
    "Hugo Torres",
    "Claudia Moreno", // 7ª -> WAITLISTED
  ];
  const roboticaEnrollments: Array<{ studentName: string; enrollmentId: string; status: string }> = [];
  for (const name of roboticaOrder) {
    const result = await enrollStudentInActivity(ampaA.id, { activityId: robotica.id, studentId: studentId(name) });
    roboticaEnrollments.push({ studentName: name, enrollmentId: result.enrollmentId, status: result.status });
  }

  for (const name of [
    "Lucía García",
    "Sofía López",
    "Diego Ruiz",
    "Álvaro Ruiz",
    "Hugo Torres",
    "Daniela Moreno",
    "Marcos Jiménez",
  ]) {
    await enrollStudentInActivity(ampaA.id, { activityId: ingles.id, studentId: studentId(name) });
  }

  for (const name of ["Pablo García", "Marta Ruiz", "Claudia Moreno", "Marcos Jiménez"]) {
    await enrollStudentInActivity(ampaA.id, { activityId: baloncesto.id, studentId: studentId(name) });
  }

  // Asistencia de Robótica en dos sesiones (solo inscripciones ENROLLED, no la que
  // quedó en lista de espera) — Pablo García falta un día, para que se vea variedad.
  for (const entry of roboticaEnrollments) {
    if (entry.status !== "ENROLLED") continue;
    await recordAttendance(ampaA.id, {
      enrollmentId: entry.enrollmentId,
      date: new Date("2026-09-15"),
      present: entry.studentName !== "Pablo García",
    });
    await recordAttendance(ampaA.id, {
      enrollmentId: entry.enrollmentId,
      date: new Date("2026-09-22"),
      present: true,
    });
  }

  // ─── Eventos con aforo y cobro (con lista de espera en uno de ellos) ──────────
  const fiestaFinDeCurso = await createEvent(ampaA.id, {
    name: "Fiesta de fin de curso",
    date: new Date("2027-06-20"),
    capacity: 40,
    price: 5,
  });
  const excursionNieve = await createEvent(ampaA.id, {
    name: "Excursión a la nieve",
    date: new Date("2027-02-14"),
    capacity: 20,
    price: 45,
  });
  const charlaOrientacion = await createEvent(ampaA.id, {
    name: "Charla de orientación académica",
    date: new Date("2026-10-10"),
  });

  function familyId(key: string): string {
    const id = familyIdByKey.get(key);
    if (!id) throw new Error(`Seed: familia "${key}" no encontrada`);
    return id;
  }

  for (const [key, attendeeCount] of [
    ["garcia", 4],
    ["lopez", 2],
    ["ruiz", 5],
    ["torres", 2],
    ["moreno", 3],
    ["jimenez", 2],
  ] as const) {
    await registerFamilyForEvent(ampaA.id, {
      eventId: fiestaFinDeCurso.id,
      familyId: familyId(key),
      attendeeCount,
    });
  }

  // Aforo 20: García(4)+Ruiz(5)+Moreno(4)+Torres(3)+López(3) = 19 registrados;
  // Jiménez(3) haría 22 -> se queda en lista de espera.
  for (const [key, attendeeCount] of [
    ["garcia", 4],
    ["ruiz", 5],
    ["moreno", 4],
    ["torres", 3],
    ["lopez", 3],
    ["jimenez", 3],
  ] as const) {
    await registerFamilyForEvent(ampaA.id, {
      eventId: excursionNieve.id,
      familyId: familyId(key),
      attendeeCount,
    });
  }

  for (const [key, attendeeCount] of [
    ["garcia", 4],
    ["lopez", 2],
  ] as const) {
    await registerFamilyForEvent(ampaA.id, {
      eventId: charlaOrientacion.id,
      familyId: familyId(key),
      attendeeCount,
    });
  }

  // ─── Tablón de comunicados ─────────────────────────────────────────────────────
  await createAnnouncement(ampaA.id, {
    title: "Bienvenida al curso 2026-2027",
    body:
      "Un año más, desde la junta de la AMPA os damos la bienvenida al nuevo curso. " +
      "En los próximos días abriremos el plazo de inscripción a las extraescolares y " +
      "os convocaremos a la primera asamblea general del año.",
  });
  await createAnnouncement(ampaA.id, {
    title: "Convocatoria de asamblea general ordinaria",
    body:
      "Se convoca a todas las familias asociadas a la asamblea general ordinaria, que " +
      "se celebrará el próximo mes en el salón de actos del centro. Orden del día: " +
      "aprobación de cuentas, renovación parcial de la junta y ruegos y preguntas.",
  });
  await createAnnouncement(ampaA.id, {
    title: "Apertura de inscripciones para extraescolares",
    body:
      "Ya está abierto el plazo de inscripción para Robótica educativa, Inglés " +
      "extraescolar y Baloncesto. Las plazas son limitadas y se asignan por orden de " +
      "inscripción; si una actividad se llena, se pasa a lista de espera automática.",
  });
  await createAnnouncement(ampaA.id, {
    title: "Recordatorio: fecha límite de pago de la cuota anual",
    body:
      "Recordamos a las familias que aún no han abonado la cuota anual que el plazo " +
      "de pago vence a los 30 días del alta. Podéis consultar el estado de vuestro " +
      "cargo en vuestro carnet digital o contactando con tesorería.",
  });

  // ─── Repositorio de documentos ─────────────────────────────────────────────────
  await createDocument(ampaA.id, {
    title: "Estatutos de la AMPA",
    url: "https://example.com/documentos/estatutos-ampa-campanar.pdf",
    category: "Estatutos",
  });
  await createDocument(ampaA.id, {
    title: "Acta de la última asamblea general",
    url: "https://example.com/documentos/acta-asamblea-2026.pdf",
    category: "Actas",
  });
  await createDocument(ampaA.id, {
    title: "Calendario escolar 2026-2027",
    url: "https://example.com/documentos/calendario-escolar.pdf",
    category: "Calendario",
  });
  await createDocument(ampaA.id, {
    title: "Solicitud de beca de comedor",
    url: "https://example.com/documentos/solicitud-beca-comedor.pdf",
    category: "Becas y ayudas",
  });

  // ─── Libro de actas (cadena de hashes) ─────────────────────────────────────────
  // Deben crearse en serie (no en paralelo): cada asiento depende del hash del
  // anterior para encadenar correctamente.
  await createMinutesEntry(ampaA.id, {
    title: "Constitución de la nueva junta directiva",
    body:
      "Se constituye la nueva junta directiva de la AMPA para el curso 2026-2027, " +
      "quedando conformada por presidencia, secretaría, tesorería y vocalías. Se " +
      "acuerda continuar con las extraescolares del curso anterior.",
    signedByName: "María García Martínez (Presidenta)",
  });
  await createMinutesEntry(ampaA.id, {
    title: "Aprobación del presupuesto anual 2026-2027",
    body:
      "Se presenta y aprueba por unanimidad el presupuesto anual, incluyendo las " +
      "partidas de extraescolares, eventos, subvenciones a familias y gastos de " +
      "gestión. Se acuerda mantener el fondo de reserva del ejercicio anterior.",
    signedByName: "María García Martínez (Presidenta)",
  });
  await createMinutesEntry(ampaA.id, {
    title: "Acuerdo de colaboración con Academia Britannia",
    body:
      "Se aprueba la renovación del acuerdo de colaboración con Academia Britannia " +
      "para la impartición de la extraescolar de inglés durante el curso 2026-2027, " +
      "en los mismos términos económicos que el curso anterior.",
    signedByName: "Javier López Fernández (Secretario)",
  });

  // ─── Usuarios de junta de prueba ────────────────────────────────────────────────
  // En desarrollo (sin credenciales AWS) el enlace mágico se imprime en la consola
  // de `pnpm dev` en vez de enviarse por email de verdad — pide el magic link con
  // estos emails en /login.
  const presidencia = await prisma.user.upsert({
    where: { email: "presidencia@example.com" },
    update: {},
    create: { email: "presidencia@example.com", name: "Presidenta de prueba" },
  });
  await prisma.userAmpaRole.upsert({
    where: { userId_ampaId_role: { userId: presidencia.id, ampaId: ampaA.id, role: "PRESIDENCIA" } },
    update: {},
    create: { userId: presidencia.id, ampaId: ampaA.id, role: "PRESIDENCIA" },
  });

  const tesoreria = await prisma.user.upsert({
    where: { email: "tesoreria@example.com" },
    update: {},
    create: { email: "tesoreria@example.com", name: "Tesorero de prueba" },
  });
  await prisma.userAmpaRole.upsert({
    where: { userId_ampaId_role: { userId: tesoreria.id, ampaId: ampaA.id, role: "TESORERIA" } },
    update: {},
    create: { userId: tesoreria.id, ampaId: ampaA.id, role: "TESORERIA" },
  });

  // Superadmin de PLATAFORMA de prueba (equipo Gigson/ONG) para poder entrar en
  // local a /admin — distinto del PRESIDENCIA de arriba, que solo ve su AMPA.
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { isPlatformAdmin: true },
    create: { email: "admin@example.com", name: "Admin de plataforma", isPlatformAdmin: true },
  });

  console.log("Seed OK:", {
    ampaA: ampaA.subdomain,
    ampaB: ampaB.subdomain,
    yearA: yearA.label,
    yearB: yearB.label,
    familiesInCampanar: demoFamilies.length,
    familyB: familyB.referenceCode,
    feeSchemaA: feeSchemaA.name,
    activities: [robotica.id, ingles.id, baloncesto.id].length,
    events: [fiestaFinDeCurso.id, excursionNieve.id, charlaOrientacion.id].length,
    boardUsers: [presidencia.email, tesoreria.email],
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
