-- CreateTable
CREATE TABLE "shift_tasks" (
    "id" TEXT NOT NULL,
    "ampaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_signups" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SIGNED_UP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_tasks_ampaId_idx" ON "shift_tasks"("ampaId");

-- CreateIndex
CREATE INDEX "shifts_taskId_idx" ON "shifts"("taskId");

-- CreateIndex
CREATE INDEX "shift_signups_shiftId_idx" ON "shift_signups"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_signups_shiftId_guardianId_key" ON "shift_signups"("shiftId", "guardianId");

-- AddForeignKey
ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_ampaId_fkey" FOREIGN KEY ("ampaId") REFERENCES "ampas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "shift_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_signups" ADD CONSTRAINT "shift_signups_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_signups" ADD CONSTRAINT "shift_signups_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (capa 3) — misma migración que crea la tabla, para no repetir el olvido
-- de MinutesEntry (ver 20260803163000_minutes_entries_rls). Solo `shift_tasks`
-- lleva `ampaId` propio (`shifts`/`shift_signups` se aíslan transitivamente,
-- igual que `activity_enrollments`/`attendance_records` para `activities` —
-- ninguna de esas dos tablas hijas tiene política RLS propia tampoco).
ALTER TABLE "shift_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_tasks" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "shift_tasks"
  USING ("ampaId" = current_setting('app.current_ampa', true));
