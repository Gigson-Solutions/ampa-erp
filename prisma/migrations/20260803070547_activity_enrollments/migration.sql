-- CreateTable
CREATE TABLE "activity_enrollments" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENROLLED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_enrollments_activityId_idx" ON "activity_enrollments"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_enrollments_activityId_studentId_key" ON "activity_enrollments"("activityId", "studentId");

-- AddForeignKey
ALTER TABLE "activity_enrollments" ADD CONSTRAINT "activity_enrollments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_enrollments" ADD CONSTRAINT "activity_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
