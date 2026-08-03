-- CreateTable
CREATE TABLE "minutes_entries" (
    "id" TEXT NOT NULL,
    "ampaId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "previousHash" TEXT,
    "hash" TEXT NOT NULL,
    "signedByName" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "minutes_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "minutes_entries_ampaId_idx" ON "minutes_entries"("ampaId");

-- CreateIndex
CREATE UNIQUE INDEX "minutes_entries_ampaId_sequenceNumber_key" ON "minutes_entries"("ampaId", "sequenceNumber");

-- AddForeignKey
ALTER TABLE "minutes_entries" ADD CONSTRAINT "minutes_entries_ampaId_fkey" FOREIGN KEY ("ampaId") REFERENCES "ampas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
