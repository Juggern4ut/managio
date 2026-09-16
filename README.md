# Managio

Self-hosted, privacy-first personal document manager: scanned mail, digital
mail, receipts, warranties, coupons, and the relationships between them. See
`roadmap.md` for the full project roadmap and `.claude/skills/managio/SKILL.md`
for the architectural conventions this codebase follows.

## Stack

- Nuxt 4 / Vue / TypeScript / Nitro
- PostgreSQL via Drizzle ORM
- Redis + BullMQ for background processing, run by a standalone worker process
- OCRmyPDF + Tesseract (PDFs), Tesseract + ImageMagick/poppler (images) for OCR and previews
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

2. Start Postgres and Redis with Docker Compose, then run the app and worker locally:

   ```bash
   docker compose up -d db redis
   npm install
   npm run db:generate   # only needed after schema.ts changes
   npm run db:migrate
   npm run dev            # in one terminal
   npm run worker:dev     # in another — needs ocrmypdf, tesseract, pdftoppm, convert on PATH
   ```

   Or run everything in containers (the worker image installs the OCR
   toolchain, so you don't need it on your host): `docker compose up`.

   If you add or change an npm dependency and rebuild, Compose can reuse a
   stale anonymous `node_modules` volume and fail with "Cannot find
   package". Fix: `docker compose rm -fsv app worker && docker compose up -d --build app worker`.

   The containers write into `./data` as root, so switching from `docker
   compose up` to running `npm run dev` directly on the host can hit
   `EACCES` on upload. Fix: `docker run --rm -v "$(pwd)":/app node:24-alpine
   chown -R "$(id -u):$(id -g)" /app/data`.

3. Visit http://localhost:3000 and sign in with the admin user from `.env`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Nuxt dev server |
| `npm run worker:dev` | Start the background processing worker (watch mode) |
| `npm run build` | Production build |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | Type-check the Nuxt app and the worker |
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
  services/
    documents/  Upload validation, file-signature sniffing, checksums, stage logging
    storage/    Storage interface (filesystem today, swappable for MinIO)
    jobs/       BullMQ queue + Redis connection (shared with the worker)
  middleware/   Server middleware (auth guard)
  utils/        Auto-imported server utils (db client, logger)
worker/         Standalone Node process consuming the documents queue
  processors/   Preview generation, OCR, per-document orchestration
shared/
  schemas/      Zod schemas (source of truth for controlled values)
  types/        Types inferred from schemas
db/
  schema.ts     Drizzle schema
  migrations/   Generated SQL migrations
tests/          Vitest tests
```

## Status

- **Phase 1** — project foundation: Postgres connectivity, migrations,
  session auth, structured logging, `/api/health`.
- **Phase 2** — document ingestion: upload (PDF/JPEG/PNG/TIFF/WEBP/HEIC)
  validated by magic-byte sniffing, SHA-256 dedup, filesystem storage, the
  Inbox upload UI.
- **Phase 3** — OCR and previews: a BullMQ worker generates a preview image
  and runs OCR (OCRmyPDF for PDFs, Tesseract for images) on every upload,
  recording per-stage timing/errors and retrying transient failures. The
  document detail page shows the preview next to the extracted text.
- **Phase 4** — search and manual organization: PostgreSQL full-text search
  over filename + OCR text (weighted, `simple` config for multilingual
  content), manual document type/company/category/tags, and an Inbox that
  now shows only documents still needing review — everything else lives on
  the searchable/filterable Documents page.
- **Phase 5** — core domain model: products, receipts (with line items),
  warranties, coupons, expenses, and document-to-document relations —
  manual entry for now (deterministic/AI extraction lands in later
  phases). Money is always integer minor units + a currency code, never
  floating point. Reachable from the nav bar; the document detail page
  gained a "Related documents" section for linking documents to each other
  (`related_to`, `duplicate_of`, `part_of_case`, `supports_purchase`,
  `proves_warranty`).

AI classification/extraction land in later phases per `roadmap.md`.
