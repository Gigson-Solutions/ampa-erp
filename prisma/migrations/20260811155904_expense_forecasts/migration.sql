-- CreateTable
CREATE TABLE "expense_forecasts" (
    "id" TEXT NOT NULL,
    "ampaId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_forecasts_ampaId_idx" ON "expense_forecasts"("ampaId");

-- AddForeignKey
ALTER TABLE "expense_forecasts" ADD CONSTRAINT "expense_forecasts_ampaId_fkey" FOREIGN KEY ("ampaId") REFERENCES "ampas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (capa 3) — misma migración que crea la tabla, para no repetir el olvido
-- de MinutesEntry (ver 20260803163000_minutes_entries_rls): toda tabla nueva
-- con `ampaId` propio necesita registrarse en TENANT_SCOPED_MODELS (capa 2,
-- ya hecho en src/lib/tenant.ts) Y aquí (capa 3) en el mismo commit.
ALTER TABLE "expense_forecasts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_forecasts" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "expense_forecasts"
  USING ("ampaId" = current_setting('app.current_ampa', true));
