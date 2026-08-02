# ampa-erp — Claude Code Context

This file is read automatically by Claude Code on every session.

---

## Project Overview

**ampa-erp** — ERP multi-tenant gratuito (vía ONG) para AMPAs de institutos.
Compite con [miampa.com](https://miampa.com/) cubriendo lo que este no resuelve bien:
libros legales (LO 1/2002), contabilidad PGC ESFL, conciliación Norma 43, devoluciones
SEPA, banco de libros de texto, taquillas, asamblea digital.

**Key constraints:**
- Coste de infraestructura marginal ~cero por AMPA añadida (objetivo: ~6 €/mes plano).
- Cada AMPA es un tenant aislado (Postgres RLS + Prisma Client Extension `$extends`).
- Cada AMPA tramita su propio Creditor ID SEPA — no hay acreedor centralizado.
- Multiidioma es/ca/eu/gl/va desde el primer commit.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Language | TypeScript | Primary language |
| Framework | Next.js 16 (App Router) | Full-stack app |
| DB | PostgreSQL + Prisma 7 | Persistencia + ORM |
| Auth | NextAuth v5 (magic link) | Sin contraseñas |
| i18n | next-intl | es/ca/eu/gl/va |
| Package Manager | pnpm | Dependency management |
| Deploy | Hetzner CX22 + Coolify | Self-hosted |
| Pagos | Stripe Connect Standard | Tarjeta + Bizum, por-AMPA |
| Domiciliación | `pain.008.001.02` propio | SEPA, Creditor ID por-AMPA |

---

## Project Structure

```
prisma/schema.prisma       # ampaId en toda tabla de negocio
src/proxy.ts               # resolución de subdominio → ampaId
src/lib/prisma.ts          # $extends con filtro ampaId + SET LOCAL app.current_ampa
src/lib/auth.ts            # NextAuth v5, magic link, ampaId en sesión
src/i18n/                  # next-intl, 5 locales
src/app/(public)/[ampa]/   # web pública + alta de socio
src/app/(family)/          # portal de familias (PWA)
src/app/(board)/           # backoffice de la junta
```

---

## Architecture

Multi-tenant en una sola base de datos Postgres. Aislamiento en tres capas:
1. `proxy.ts` resuelve subdominio y valida que la sesión pertenece a ese AMPA.
2. Prisma Client Extension (`$extends`) inyecta `where: { ampaId }` en todo query.
3. RLS en Postgres con `SET LOCAL app.current_ampa` por transacción — red de
   seguridad si (1) y (2) fallan.

Ver detalle completo de decisiones y roadmap en el documento de visión original y en
`~/.claude/plans/revisa-el-siguiente-plan-composed-dahl.md` (contexto de Gigson, no
versionado en este repo).

---

## Code Conventions

### General
- **Never use `any`** in TypeScript — use `unknown` and narrow
- **Explicit return types** for functions and methods
- **Use `??`** not `||` for nullish coalescing

### Git
- Conventional Commits: `type: description`
- Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`
- **NEVER add Co-Authored-By or AI attributions**
- **NEVER add AI branding to PR descriptions**

---

## Development Commands

Install: `pnpm install`
Dev: `pnpm dev`
Test: `pnpm test`
Typecheck: `pnpm typecheck`
Lint: `pnpm lint`
Format: `pnpm format`

---

## Testing Strategy

- Test crítico e irrenunciable: **aislamiento multi-tenant** — un usuario de la AMPA A
  nunca debe poder leer/escribir datos de la AMPA B (query directa, id en URL, server
  action). Ver `tests/tenant-isolation.test.ts`.
- Unit tests de cálculo de cuotas (`fees.ts`) con casos reales: hermanos, becas, alta a
  mitad de curso, familia numerosa.

---

## CI/CD

- `.github/workflows/ci.yml`: lint + typecheck + test + build en cada push/PR.
- El deploy real lo dispara Coolify (webhook en push a `main`), no GitHub Actions.

---

## Current Phase

**Fase 0 — Fundaciones.** Scaffold del stack, schema Prisma con `ampaId`/RLS, auth por
magic link, i18n, Docker Compose para Coolify. Ver roadmap completo en el documento de
visión (Fases 1-3: MVP vendible, tesorería/gobernanza, diferenciales de instituto).

---

**Last updated:** 2026-08-02.
