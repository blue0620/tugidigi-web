const appBaseURL = process.env.NUXT_APP_BASE_URL || '/dl/';
const normalizedBaseURL = appBaseURL.endsWith('/') ? appBaseURL : `${appBaseURL}/`;
const devApiProxyPath = `${normalizedBaseURL}api/`;

export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: normalizedBaseURL,
    head: {
      link: [
        { rel: 'shortcut icon', href: `${normalizedBaseURL}favicon.ico` },
        {
          rel: 'stylesheet',
          href: '//cdn.materialdesignicons.com/2.5.94/css/materialdesignicons.min.css',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiPrefix: 'api',
      apiOrigin: process.env.NUXT_PUBLIC_API_ORIGIN || '',
      clipTextEndpoint: process.env.NUXT_PUBLIC_CLIP_TEXT_ENDPOINT || '/cliptext2vec/',
      imageFeaturesEndpoint:
        process.env.NUXT_PUBLIC_IMAGE_FEATURES_ENDPOINT || `${normalizedBaseURL}api/imagefeatures`,
      tableRecEndpoint: process.env.NUXT_PUBLIC_TABLE_REC_ENDPOINT || '/tablerec/',
    },
  },
  experimental: {
    appManifest: false,
    viteEnvironmentApi: true,
  },
  nitro: process.env.NODE_ENV === 'development'
    ? {
        devProxy: {
          [devApiProxyPath]: {
            target: 'https://lab.ndl.go.jp/dl/api/',
            prependPath: true,
            changeOrigin: true,
          },
        },
      }
    : undefined,
  compatibilityDate: '2026-05-02',
});
