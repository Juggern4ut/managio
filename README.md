# Managio

Self-hosted, privacy-first personal document manager: scanned mail, digital
mail, receipts, warranties, coupons, and the relationships between them. See
`roadmap.md` for the full project roadmap and `.claude/skills/managio/SKILL.md`
for the architectural conventions this codebase follows.

## Stack

- Nuxt 4 / Vue / TypeScript / Nitro
- PostgreSQL via Drizzle ORM
- Zod for schema validation (shared between client and server)
- Session auth via `nuxt-auth-utils` (single admin user)
- Vitest for tests, ESLint (`@nuxt/eslint`) for linting

## Local development

1. Copy the env file and fill in real values:

   ```bash
   cp .env.example .env
   npm run auth:hash -- "your-password"   # paste result into NUXT_AUTH_PASSWORD_HASH
   ```

   Generate a random `NUXT_SESSION_PASSWORD` (32+ chars), e.g. `openssl rand -hex 32`.

2. Start Postgres and the app with Docker Compose:

   ```bash
   docker compose up -d db
   npm install
   npm run db:generate   # only needed after schema.ts changes
   npm run db:migrate
   npm run dev
   ```

   Or run everything in containers: `docker compose up`.

3. Visit http://localhost:3000 and sign in with the admin user from `.env`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Nuxt dev server |
| `npm run build` | Production build |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | Nuxt/TS type checking |
| `npm test` | Run the Vitest suite |
| `npm run db:generate` | Generate a migration from `db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run auth:hash -- "pw"` | Hash a password for `NUXT_AUTH_PASSWORD_HASH` |

## Project layout

```text
app/            Nuxt app: pages, layouts, components, composables
server/
  api/          Nitro API routes
  services/     Domain services (documents, storage, ocr, ai, ...)
  middleware/   Server middleware (auth guard)
  utils/        Auto-imported server utils (db client, logger)
shared/
  schemas/      Zod schemas (source of truth for controlled values)
  types/        Types inferred from schemas
db/
  schema.ts     Drizzle schema
  migrations/   Generated SQL migrations
tests/          Vitest tests
```

## Status

Phase 1 (project foundation) is in place: a deployable Nuxt app with
Postgres connectivity, migrations, session auth, structured logging, and a
`/api/health` check. Document ingestion, OCR, and AI features land in later
phases per `roadmap.md`.
