-- El rol de conexión de Postgres (POSTGRES_USER / DATABASE_URL de migraciones) es
-- SUPERUSER en la imagen oficial de postgres:16-alpine, y los superusuarios tienen
-- BYPASSRLS implícito — es decir, sin este rol adicional, la RLS de la migración
-- anterior no protege NADA en la práctica (se comprobó empíricamente en
-- tests/tenant-isolation.test.ts: una query directa como POSTGRES_USER ve filas de
-- otra AMPA pese a las políticas).
--
-- `ampa_erp_app` es NOLOGIN a propósito: nunca se conecta directamente (no necesita
-- contraseña ni entrada en DATABASE_URL). `withAmpaScope` (src/lib/tenant.ts) hace
-- `SET LOCAL ROLE ampa_erp_app` dentro de la misma transacción donde ya fija
-- `app.current_ampa` — así la RLS SÍ aplica de verdad para toda operación sobre
-- modelos de negocio, incluso si alguien se salta la capa 2 (Prisma $extends).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ampa_erp_app') THEN
    CREATE ROLE ampa_erp_app NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO ampa_erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ampa_erp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ampa_erp_app;

-- Para que las tablas creadas por migraciones futuras hereden los mismos permisos
-- sin tener que repetir este GRANT en cada migración nueva.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ampa_erp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ampa_erp_app;
