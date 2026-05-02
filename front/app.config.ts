export default defineAppConfig({
  service: {
    name: 'Next Digital Library',
    nameJa: '次世代デジタルライブラリー',
    domain: 'https://lab.ndl.go.jp',
    headerKey: 'hsq',
  },
  migration: {
    routes: {
      top: 'migrated',
      fulltextsearch: 'migrated',
      illustsearch: 'migrated',
      illustsearchres: 'migrated',
      book: 'migrated',
      mypage: 'migrated',
      'legacy-catch-all': 'legacy',
    },
  },
});
