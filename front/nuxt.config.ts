export default defineNuxtConfig({
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/dl/',
  },
  routeRules: {
    '/**': { ssr: false },
  },
  compatibilityDate: '2026-05-02',
});
