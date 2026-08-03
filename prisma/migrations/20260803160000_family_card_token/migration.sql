-- AlterTable
-- Escrita a mano (no via `prisma migrate dev`) porque el CLI pide confirmación
-- interactiva ante cualquier UNIQUE nuevo sobre una tabla con filas existentes,
-- incluso cuando es completamente seguro: `cardToken` es nullable y Postgres
-- permite múltiples NULL en una columna UNIQUE sin conflicto (NULL <> NULL a
-- efectos de unicidad). Las familias ya existentes simplemente no tendrán token
-- hasta que se les genere uno perezosamente (ver src/lib/card.ts).
ALTER TABLE "families" ADD COLUMN "cardToken" TEXT;

CREATE UNIQUE INDEX "families_cardToken_key" ON "families"("cardToken");
