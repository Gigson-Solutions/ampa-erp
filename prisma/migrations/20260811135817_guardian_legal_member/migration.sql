-- AlterTable
ALTER TABLE "guardians" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "isLegalMember" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memberJoinedAt" TIMESTAMP(3),
ADD COLUMN     "memberLeftAt" TIMESTAMP(3);
