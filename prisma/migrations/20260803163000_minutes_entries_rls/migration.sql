-- Bug real encontrado por un test (tests/minutes.test.ts): `minutes_entries` es la
-- primera tabla nueva con `ampaId` propio añadida DESPUÉS de la migración RLS
-- original (0001_rls) — se creó (migración 20260803143726_minutes_entries) sin
-- añadirla ni a `TENANT_SCOPED_MODELS` (capa 2, ya corregido en src/lib/tenant.ts)
-- ni a las políticas RLS (capa 3, esta migración). Sin ninguna de las dos, no
-- tenía NINGÚN aislamiento multi-tenant real. Mismo patrón que 0001_rls.
ALTER TABLE "minutes_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "minutes_entries" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "minutes_entries"
  USING ("ampaId" = current_setting('app.current_ampa', true));
