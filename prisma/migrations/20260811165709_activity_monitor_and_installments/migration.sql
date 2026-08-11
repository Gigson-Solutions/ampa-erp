-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "installmentCount" INTEGER,
ADD COLUMN     "installmentRecurrenceDays" INTEGER,
ADD COLUMN     "monitorUserId" TEXT;
