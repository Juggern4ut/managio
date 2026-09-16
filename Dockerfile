# Production image for the `managio-app` service (Nuxt/Nitro server).
# Companion to Dockerfile.worker.prod, which runs the same codebase as the
# background processing worker. See README.md "Deploying" for how the two
# are wired together.
#
# Debian-based (not alpine), matching Dockerfile.worker.prod's OS family.
#
# Uses `npm install` rather than `npm ci`: this dependency tree has an
# optional wasm32-wasi fallback package (via unrs-resolver, a Vite/Rolldown
# transitive dep) whose own nested optional deps trip up npm ci's stricter
# lockfile-completeness check even on a lockfile npm itself just generated
# — a known npm/ecosystem quirk with optional napi/wasm platform packages,
# not specific to this repo. `npm install` doesn't hit it.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Nitro's node-server output is meant to be self-contained (.output/server
# has its own trimmed node_modules), but drizzle-kit is invoked as a
# separate CLI for the migrate-on-boot step below and isn't part of that
# traced server bundle — so the full node_modules from `deps` still comes
# along too.
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY package.json drizzle.config.ts ./
COPY db ./db

EXPOSE 3000

# Uses Node directly rather than curl/wget, which this slim base doesn't
# include.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Applies any pending migrations before serving — idempotent, so this is
# safe on every restart/redeploy. Only the app service does this (not the
# worker), to avoid two containers racing to migrate on the same deploy.
#
# Re-exports DATABASE_URL/STORAGE_DIR under their NUXT_-prefixed names
# right before starting the built server. Nuxt's runtimeConfig defaults
# (nuxt.config.ts's `process.env.DATABASE_URL || ...`) are baked in at
# build time, not re-read at container start — only Nitro's standard
# NUXT_<KEY> env-override convention is re-applied at runtime. `npm run
# dev` doesn't hit this (it re-evaluates nuxt.config.ts on every start),
# which is why this only shows up in the built image. drizzle-kit (the
# migrate step above) and the worker both read the plain names directly,
# so operators only ever set DATABASE_URL/STORAGE_DIR — this bridges the
# one place that actually needs the prefixed form.
CMD ["sh", "-c", "npm run db:migrate && NUXT_DATABASE_URL=\"$DATABASE_URL\" NUXT_STORAGE_DIR=\"$STORAGE_DIR\" node .output/server/index.mjs"]
