<script setup lang="ts">
import { ndcData } from '~/src/ts/utils/ndcdata';

definePageMeta({ name: 'fulltextsearch' });

const route = useRoute();
const router = useRouter();
const migration = useRouteMigration('fulltextsearch');
const { asStringArray, normalizeQuery } = useQueryParams();
const { $notify } = useNuxtApp();

const keyword = ref(asStringArray(route.query.keyword).join(' '));
const title = ref(String(route.query['f-title'] || ''));
const author = ref(String(route.query['f-responsibility'] || ''));
const since = ref(String(route.query['r-publishyear'] || '').split(',')[0] || '');
const until = ref(String(route.query['r-publishyear'] || '').split(',')[1] || '');
const searchfield = ref(route.query.searchfield === 'contentonly');
const withoutHighlight = ref(route.query.withouthighlight === 'true');
const withoutImage = ref(route.query.withoutimg === 'true');
const isClassic = ref(route.query['fc-isClassic'] === 'true' ? 'true' : route.query['fc-isClassic'] === 'false' ? 'false' : '');
const ndc = ref(
  Array.isArray(route.query['f-ndc'])
    ? route.query['f-ndc'].filter((value): value is string => typeof value === 'string')
    : typeof route.query['f-ndc'] === 'string'
      ? [route.query['f-ndc']]
      : [],
);
const filterOpen = ref(
  Boolean(
    route.query['f-title'] ||
    route.query['f-responsibility'] ||
    route.query['r-publishyear'] ||
    route.query['fc-isClassic'] ||
    route.query['f-ndc'],
  ),
);

const activeKeywords = computed(() => asStringArray(route.query.keyword));
const hasQuery = computed(() => (
  activeKeywords.value.length > 0 ||
  Boolean(route.query.image) ||
  Boolean(route.query['f-title']) ||
  Boolean(route.query['f-responsibility']) ||
  Boolean(route.query['r-publishyear'])
));

const readDefaultSort = () => {
  if (!import.meta.client) return '';
  try {
    const value = localStorage.getItem('fulltext_default_sort') || '';
    return ['publishyear:asc', 'publishyear:desc', ''].includes(value) ? value : '';
  } catch (error) {
    console.error(error);
    return '';
  }
};

watch(
  () => route.fullPath,
  () => {
    keyword.value = asStringArray(route.query.keyword).join(' ');
    title.value = String(route.query['f-title'] || '');
    author.value = String(route.query['f-responsibility'] || '');
    since.value = String(route.query['r-publishyear'] || '').split(',')[0] || '';
    until.value = String(route.query['r-publishyear'] || '').split(',')[1] || '';
    searchfield.value = route.query.searchfield === 'contentonly';
    withoutHighlight.value = route.query.withouthighlight === 'true';
    withoutImage.value = route.query.withoutimg === 'true';
    isClassic.value = route.query['fc-isClassic'] === 'true' ? 'true' : route.query['fc-isClassic'] === 'false' ? 'false' : '';
    ndc.value = Array.isArray(route.query['f-ndc'])
      ? route.query['f-ndc'].filter((value): value is string => typeof value === 'string')
      : typeof route.query['f-ndc'] === 'string'
        ? [route.query['f-ndc']]
        : [];
  },
);

const search = async () => {
  const keywords = keyword.value.split(/[\s\u3000]+/).filter(Boolean);
  if (keywords.join('').length < 2) {
    $notify('2文字以上のキーワードを入力してください。', 'error');
    return;
  }

  await router.push({
    name: 'fulltextsearch',
    query: normalizeQuery({
      keyword: keywords,
      searchfield: searchfield.value ? 'contentonly' : '',
      withoutimg: withoutImage.value ? 'true' : '',
      withouthighlight: withoutHighlight.value ? 'true' : '',
      'f-title': title.value,
      'f-responsibility': author.value,
      'r-publishyear': since.value || until.value ? `${since.value},${until.value}` : '',
      'fc-isClassic': isClassic.value,
      'f-ndc': ndc.value,
      sort: String(route.query.sort || readDefaultSort() || ''),
    }),
  });
};
</script>

<template>
  <main class="fulltext-search page-shell">
    <div class="heading-row">
      <div class="heading-main">
        <h1>全文検索</h1>
        <p class="guide" :class="{ 'is-hidden': keyword }">
          2文字以上のキーワードを入れてください。目次と本文からキーワードを含む資料を検索します。
        </p>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <form class="search-box" @submit.prevent="search">
      <div class="search-input-row">
        <input
          v-model="keyword"
          class="input keyword-input"
          type="text"
          autocomplete="off"
          @keyup.esc="keyword = ''"
        >
        <button class="button search-button" type="submit">検索</button>
      </div>

      <div class="option-row">
        <label>
          <input v-model="searchfield" type="checkbox">
          本文のみを検索する
        </label>
        <label>
          <input v-model="withoutImage" type="checkbox">
          検索結果に図表を表示しない
        </label>
      </div>

      <details class="advanced-box" :open="filterOpen">
        <summary>詳細検索</summary>
        <div class="advanced-grid">
          <label class="field">
            <span>タイトル</span>
            <input v-model="title" class="input" type="text">
          </label>

          <label class="field">
            <span>著者</span>
            <input v-model="author" class="input" type="text">
          </label>

          <label class="field">
            <span>出版年（範囲）</span>
            <div class="year-range">
              <input v-model="since" class="input" type="text" inputmode="numeric" placeholder="From">
              <span>~</span>
              <input v-model="until" class="input" type="text" inputmode="numeric" placeholder="To">
            </div>
          </label>

          <label class="field">
            <span>古典籍</span>
            <select v-model="isClassic" class="select">
              <option value="">-</option>
              <option value="true">古典籍のみ</option>
              <option value="false">図書</option>
            </select>
          </label>
        </div>

        <FulltextNdcFilter v-model="ndc" :ndc-data="ndcData" />

        <div class="advanced-actions">
          <button class="button" type="submit">絞り込み検索</button>
          <NuxtLink class="button is-secondary" to="/fulltext">条件をクリア</NuxtLink>
        </div>
      </details>
    </form>

    <FulltextResults v-if="hasQuery" :without-image="withoutImage" />
  </main>
</template>

<style scoped>
.fulltext-search {
  padding-top: 1rem;
}

.heading-row {
  align-items: start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.heading-main h1 {
  margin-bottom: 0.4rem;
}

.guide {
  color: #4b5563;
  line-height: 1.7;
  margin: 0;
}

.guide.is-hidden {
  visibility: hidden;
}

.search-box {
  margin-top: 1rem;
}

.search-input-row {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: minmax(0, 1fr) auto;
}

.search-button {
  min-width: 6rem;
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.25rem;
  margin-top: 0.75rem;
}

.option-row label {
  align-items: center;
  display: flex;
  gap: 0.45rem;
}

.advanced-box {
  border-top: 1px solid #d8dee8;
  margin-top: 1rem;
  padding-top: 0.8rem;
}

.advanced-box summary {
  color: #334155;
  cursor: pointer;
  font-weight: 600;
  list-style: none;
}

.advanced-box summary::-webkit-details-marker {
  display: none;
}

.advanced-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 0.8rem;
}

.field {
  display: grid;
  gap: 0.3rem;
}

.field span {
  color: #53657a;
  font-size: 0.9rem;
}

.year-range {
  align-items: center;
  display: grid;
  gap: 0.4rem;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.advanced-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1rem;
}

@media (max-width: 760px) {
  .heading-row {
    display: grid;
  }

  .search-input-row,
  .advanced-grid {
    grid-template-columns: 1fr;
  }
}
</style>
