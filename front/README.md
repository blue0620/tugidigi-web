# Frontend 運用コマンド

## 基本運用

- 開発時は `npm run dev` を使用する。
- 本番確認は `npm run build && npm run preview` を使用する。

## 互換運用

- `npm start` は既存運用との互換のため、`npm run dev` のエイリアスとして維持する。

## 移行方針

- 旧 webpack 系スクリプト（`build-stg` 含む）は `package.json` から削除済み。
- Nuxt 3 標準スクリプトへの切替を 2026-05-02 に完了した。
