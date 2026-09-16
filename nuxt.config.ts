// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint', 'nuxt-auth-utils'],

  runtimeConfig: {
    // `DATABASE_URL` (no NUXT_ prefix) is the convention drizzle-kit's CLI
    // also reads, so both the app and migrations share one env var name.
    databaseUrl: process.env.DATABASE_URL || '',
    authUsername: '',
    authPasswordHash: '',
    logFormat: 'pretty',
    storageDir: './data/documents',
  },

  nitro: {
    experimental: {
      openAPI: false,
    },
  },
})
