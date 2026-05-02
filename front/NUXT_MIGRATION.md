# Nuxt 3 migration notes

## baseURL switching
`nuxt.config.ts` uses `NUXT_APP_BASE_URL` and defaults to `/dl/`.

Examples:

- Development: `NUXT_APP_BASE_URL=/dl/ npm run nuxt:dev`
- Staging: `NUXT_APP_BASE_URL=/dl-stg/ npm run nuxt:dev`
- Production build: `NUXT_APP_BASE_URL=/dl/ npm run nuxt:build`

## Route mapping from legacy vue-router

| Legacy route | Nuxt page file |
|---|---|
| `/` | `pages/index.vue` |
| `/fulltext` | `pages/fulltext.vue` |
| `/illust` | `pages/illust/index.vue` |
| `/illust/search` | `pages/illust/search.vue` |
| `/book/:id` | `pages/book/[id].vue` |
| `/mypage` | `pages/mypage.vue` |

## 404 / catch-all behavior

Legacy app redirected unknown paths to top (`{ path: "*", redirect: { name: "top" } }`).
Nuxt migration keeps this behavior with `pages/[...slug].vue`, which immediately navigates to `/`.

## URL validation matrix (`baseURL` consistency)

Deep links are validated as:

### `NUXT_APP_BASE_URL=/dl/`
- `/dl/`
- `/dl/fulltext`
- `/dl/illust`
- `/dl/illust/search`
- `/dl/book/12345`
- `/dl/mypage`

### `NUXT_APP_BASE_URL=/dl-stg/`
- `/dl-stg/`
- `/dl-stg/fulltext`
- `/dl-stg/illust`
- `/dl-stg/illust/search`
- `/dl-stg/book/12345`
- `/dl-stg/mypage`

### production equivalent
Use the same prefix as the deployed environment (`/dl/` expected for production at present).
