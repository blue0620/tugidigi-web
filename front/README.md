# Frontend

This directory is being migrated to Nuxt 3.

## Commands

- `npm run dev`: start Nuxt dev server on `0.0.0.0` without forked mode.
- `npm run build`: generate the static SPA into `.output/public` with base URL `/dl/`.
- `npm run build:stg`: generate the static SPA into `.output/public` with base URL `/dl-stg/`.
- `npm run preview`: serve `.output/public` after a build.

## Deployment

The backend build copies `front/.output/public/*` into `src/main/resources/static/`.
Spring Boot serves the app under the `/dl/` context path and falls back to `index.html` for deep links.
