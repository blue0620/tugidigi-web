export default defineNuxtConfig({
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/dl/',
  },
  routeRules: {
    '/**': { ssr: false },
  },
  runtimeConfig: {
    public: {
      apiPrefix: '/api',
      apiOrigin: process.env.NUXT_PUBLIC_API_ORIGIN || '',
    },
  },
  nitro: process.env.NODE_ENV === 'development'
    ? {
        devProxy: {
          '/api/': {
            target: 'http://localhost:19998/',
            prependPath: true,
            changeOrigin: true,
          },
        },
      }
    : undefined,
  compatibilityDate: '2026-05-02',
});
