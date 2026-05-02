# Nuxt 3 migration notes

## Command policy

- `npm run dev` starts the Nuxt dev server on `0.0.0.0` without forked mode.
- `npm run build` creates a static SPA with `nuxt generate`; deploy `.output/public`.
- `npm run build:stg` creates the same static output with `NUXT_APP_BASE_URL=/dl-stg/`.
- `npm run preview` serves the generated `.output/public` directory.

## baseURL switching

`nuxt.config.ts` uses `NUXT_APP_BASE_URL` and defaults to `/dl/`.

Examples:

- Development: `npm run dev`
- Staging build: `npm run build:stg`
- Production build: `npm run build`

## Route mapping from legacy vue-router

| Legacy route | Nuxt page file | Route name |
|---|---|---|
| `/` | `pages/index.vue` | `top` |
| `/fulltext` | `pages/fulltext.vue` | `fulltextsearch` |
| `/illust` | `pages/illust/index.vue` | `illustsearch` |
| `/illust/search` | `pages/illust/search.vue` | `illustsearchres` |
| `/book/:id` | `pages/book/[id].vue` | `book` |
| `/mypage` | `pages/mypage.vue` | `mypage` |

## 404 / catch-all behavior

Legacy app redirected unknown paths to top (`{ path: "*", redirect: { name: "top" } }`).
Nuxt migration keeps this behavior with `pages/[...slug].vue`, which immediately navigates to `/`.

## URL validation matrix

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

## API and asset path policy

- Public assets live under `public/assets` and `public/favicon.ico`, without a deployment prefix in the repository.
- Use `useAppUrl().url('assets/...')` for app-base-aware asset URLs.
- Frontend API calls should use `useApiFetch('/...')`.
- `useApiFetch` resolves to the current app base URL plus `api`, for example `/dl/api/...`.
- Development only: `nitro.devProxy` forwards `/dl/api/**` to `https://lab.ndl.go.jp/dl/api/**`.
- Non-development environments use the deployed origin by default; set `NUXT_PUBLIC_API_ORIGIN` only when the API is hosted on a different origin.
