-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "present" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_records_enrollmentId_idx" ON "attendance_records"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_enrollmentId_date_key" ON "attendance_records"("enrollmentId", "date");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "activity_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
