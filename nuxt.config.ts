// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', 'nuxt-auth-utils'],

  runtimeConfig: {
    // These env var names have no NUXT_ prefix on purpose: drizzle-kit's CLI
    // and the standalone worker process read them too, so app/worker/tooling
    // share one set of names instead of three.
    databaseUrl: process.env.DATABASE_URL || '',
    storageDir: process.env.STORAGE_DIR || './data/documents',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    authUsername: '',
    authPasswordHash: '',
    // Alternative to authPasswordHash for deployment UIs that mangle `$`
    // (template-substitution syntax, accidental trimming, etc.) — base64
    // has none of those characters. Takes priority when set. Generate with
    // `npm run auth:hash`, which prints both forms.
    authPasswordHashBase64: '',
    logFormat: 'pretty',
  },

  nitro: {
    experimental: {
      openAPI: false,
    },
  },
})
