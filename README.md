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

## Deploying (Dokploy, two-Application model)

`docker-compose.yml`/`Dockerfile.dev`/`Dockerfile.worker` are dev-only
(bind-mounted source, watch mode). Production uses two separate images
built from this same repo, plus Dokploy's managed databases — mirroring
the usual "one service per part" habit even though app and worker share
one codebase:

| Dokploy resource | From this repo? | Notes |
| --- | --- | --- |
| **Database → PostgreSQL 16** | No (Dokploy-managed) | Gives you backups/volumes for free |
| **Database → Redis 7** | No (Dokploy-managed) | |
| **Application → `managio-app`** | Yes, `Dockerfile` | Public domain, port 3000 |
| **Application → `managio-worker`** | Yes, `Dockerfile.worker.prod` | No public port |

**Shared volume**: the app and worker both read/write the same document
files (uploads land via the app; previews/OCR output land via the
worker). Create one Dokploy volume (e.g. `managio_documents`) and mount
it at the same container path — matching `STORAGE_DIR` below — on
**both** Applications. This only works if both land on the same node;
Dokploy's default single-node setup is fine, a multi-node Swarm cluster
is not without shared/NFS storage.

**Migrations**: `managio-app`'s container command runs
`npm run db:migrate` before starting the server, every boot — idempotent,
so safe on every redeploy. The worker doesn't run migrations, to avoid
both containers racing on the same deploy; deploy/redeploy the app first
if you've just changed the schema.

### Env vars — `managio-app`

| Variable | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@<pg-host>:5432/managio` | From the Dokploy Postgres service |
| `REDIS_URL` | `redis://<redis-host>:6379` | From the Dokploy Redis service |
| `STORAGE_DIR` | `/app/data/documents` | Inside the shared volume mount |
| `NUXT_SESSION_PASSWORD` | `openssl rand -hex 32` | 32+ random chars |
| `NUXT_AUTH_USERNAME` | `admin` | |
| `NUXT_AUTH_PASSWORD_HASH_BASE64` | *(see below)* | Preferred over `NUXT_AUTH_PASSWORD_HASH` — see below |
| `NUXT_LOG_FORMAT` | `json` | Structured logs in production |

### Env vars — `managio-worker`

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Same value as the app |
| `REDIS_URL` | Same value as the app |
| `STORAGE_DIR` | Same value **and same mount path** as the app |
| `OCR_LANGUAGES` | e.g. `eng+deu+fra+ita` |
| `LOG_FORMAT` | `json` — note: no `NUXT_` prefix here, the worker isn't a Nuxt process |

Generate the hash locally with `npm run auth:hash -- "your-password"`, which
prints three forms. **Use the `NUXT_AUTH_PASSWORD_HASH_BASE64` one for
Dokploy** and leave `NUXT_AUTH_PASSWORD_HASH` unset — it takes priority when
both are present. The raw hash contains literal `$` characters (scrypt's
format), and we've seen a deployment UI's env var field mangle those (its
own template syntax, or just corrupting the value some other way) and
produce a 401 that looks identical whether you escape `$` as `$$` or not —
because the escaping was never the actual problem, the transport was. The
base64 form has no special characters, so there's nothing left to mangle.
The app also trims accidental leading/trailing whitespace on both
`NUXT_AUTH_USERNAME` and the hash, in case your platform's text field adds
a trailing newline on save.

If login still fails after switching to the base64 form: check that the
service actually redeployed after you changed the env var (some platforms
require an explicit redeploy, not just saving the value), and that
`NUXT_AUTH_USERNAME` is exactly what you typed with no extra whitespace.
A `401 Invalid credentials` means the app *did* find non-empty values for
both — a `500 Authentication is not configured` would mean it didn't see
them at all, which points at the env var not reaching the container rather
than a mismatched value.

Health check: point Dokploy at `GET /api/health` on `managio-app` (returns
200 with `{"status":"ok"}` once the database is reachable). The worker has
no HTTP server — leave it on plain process-alive monitoring.

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
app/            Nuxt app: pages, layouts, components (e.g. TypeBadge), composables
server/
  api/          Nitro API routes
  services/
    documents/  Upload validation, file-signature sniffing, checksums, stage logging
    storage/    Storage interface (filesystem today, swappable for MinIO)
    jobs/       BullMQ queue + Redis connection (shared with the worker)
    extraction/ Deterministic field extraction (dates, amounts, invoice/coupon codes, companies)
  middleware/   Server middleware (auth guard)
  utils/        Auto-imported server utils (db client, logger, pg error helper)
worker/         Standalone Node process consuming the documents queue
  processors/   Preview generation, OCR, deterministic extraction, per-document orchestration
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
- **Phase 6** — deterministic extraction: a new EXTRACT worker stage runs
  pattern-based extraction over OCR text right after OCR completes —
  ISO/Swiss dates (incl. 2-digit years, calendar-validated), CHF/EUR/USD
  amounts (Swiss `1'234.50` thousands separator, comma-decimal, never
  guessing on genuinely ambiguous separators), invoice numbers, due dates
  and coupon expiration dates (keyword-proximity, German/French/English
  labels), coupon codes, and matches against companies already known to
  this instance. Every result keeps its raw matched text, a confidence
  score, the extraction method, and a source snippet — nothing is ever
  written into a document/receipt/coupon automatically; the document
  detail page's "Extracted fields" panel has quick-apply buttons (date,
  company) and prefill links into the Receipts/Coupons create forms.
- **Document types made user-managed, plus document delete**: document
  type is no longer a fixed enum — `document_types` is a table like
  companies/categories, each with a user-set hex color, manageable at
  `/document-types` or inline from the document edit form. Documents
  show their type as a colored badge (`TypeBadge.vue`, text color picked
  automatically for contrast) everywhere a type appears. The old enum
  values were migrated into seeded rows and backfilled onto existing
  documents in a two-step migration (Postgres enum-to-FK conversions
  can't safely happen in one step). Documents can now be deleted (original
  file + previews removed from storage; receipts/warranties/coupons/
  expenses that reference the document keep existing, just unlinked).

AI classification/extraction land in later phases per `roadmap.md`.
