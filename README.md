# ampa-erp

ERP multi-tenant gratuito para AMPAs de institutos. Ver `CLAUDE.md` para contexto de
arquitectura y convenciones de desarrollo.

## Desarrollo local

```bash
pnpm install
docker compose up -d          # Postgres local
cp .env.example .env          # completar variables
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

## Tests

```bash
pnpm typecheck
pnpm lint
pnpm test
```
