-- Row Level Security: red de seguridad final del aislamiento multi-tenant.
-- Requiere que cada conexión ejecute `SELECT set_config('app.current_ampa', $1, true)`
-- dentro de la MISMA transacción que la query (ver src/lib/tenant.ts::withAmpaScope).
--
-- El segundo argumento de current_setting (`true`) evita que la sesión reviente si la
-- variable no se ha fijado — en ese caso current_setting devuelve NULL y la política
-- no matchea ninguna fila (fail-closed, no fail-open).

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'academic_years',
    'families',
    'fee_schemas',
    'memberships',
    'charges',
    'payments',
    'providers',
    'activities',
    'events',
    'announcements',
    'documents',
    'ledger_entries',
    'user_ampa_roles'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    -- Nota: la columna se llama "ampaId" (camelCase, entrecomillada) porque el
    -- schema.prisma solo mapea nombres de TABLA a snake_case (@@map), no de
    -- columna — igual que en erp-awesomely (ver companyId sin @map ahí).
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("ampaId" = current_setting(''app.current_ampa'', true))',
      tbl
    );
  END LOOP;
END $$;
