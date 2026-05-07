<script setup lang="ts">
import type { Book } from '~/types/domain';

definePageMeta({ name: 'book' });

const route = useRoute();
const router = useRouter();
const migration = useRouteMigration('book');
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

const id = computed(() => String(route.params.id || ''));
const activeTab = ref<'bib' | 'toc' | 'text' | 'illustrations'>('bib');
const isMetadata = ref(true);

const keywords = computed(() => {
  const value = route.query.keyword;
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  return typeof value === 'string' && value ? [value] : [];
});

const page = computed({
  get: () => {
    const raw = Number(route.query.page || 1);
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 1;
  },
  set: (nextPage: number) => {
    router.replace({
      query: {
        ...route.query,
        page: String(Math.max(1, Math.trunc(nextPage || 1))),
        keyword: keywords.value.length ? keywords.value : undefined,
      },
    });
  },
});

const book = ref<Book | null>(null);
const loading = ref(false);
const errorMessage = ref('');

const parseIndex = (items?: string[]) => {
  if (!items?.length) return null;

  return items
    .map((item) => {
      const parts = item.split('/');
      let pageNumber: number | null = null;

      try {
        const match = /\(0*(\d+)\./.exec(parts[1] || '');
        pageNumber = match ? Number(match[1]) : null;
      } catch {
        pageNumber = null;
      }

      return {
        name: (parts[0] || '').trim(),
        pg: pageNumber,
      };
    })
    .sort((left, right) => Number(left.pg) - Number(right.pg));
};

const index = computed(() => parseIndex(book.value?.index));
const autoTOCindex = computed(() => parseIndex(book.value?.autoTOCindex));
const manifestUrl = computed(() => `https://www.dl.ndl.go.jp/api/iiif/${id.value}/manifest.json`);

const loadBook = async () => {
  if (!id.value) return;

  loading.value = true;
  errorMessage.value = '';
  try {
    book.value = await useApiFetch<Book>(`/book/${id.value}`);
  } catch (error) {
    errorMessage.value = t('書誌情報を読み込めませんでした。', 'Could not load bibliographic information.');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const storeHistory = () => {
  if (!import.meta.client || !id.value) return;
  const key = 'viewed_book_history';
  const history = (localStorage.getItem(key) || '').split(',').filter(Boolean);
  const nextHistory = [id.value, ...history.filter((item) => item !== id.value)].slice(0, 100);
  localStorage.setItem(key, nextHistory.join(','));
};

watch(
  () => id.value,
  async () => {
    if (keywords.value.length) {
      activeTab.value = 'text';
    }
    storeHistory();
    await loadBook();
  },
  { immediate: true },
);
</script>

<template>
  <main class="book-view">
    <section class="book-columns">
      <aside class="meta-column">
        <template v-if="book">
          <div class="meta-header">
            <h1 class="book-title">{{ book.title }}{{ book.volume ? ` ${book.volume}` : '' }}</h1>
            <MigrationStatus :status="migration.status" />
          </div>
        </template>
        <div v-else class="meta-header">
          <h1 class="book-title">{{ t('資料', 'Material') }} {{ id }}</h1>
          <MigrationStatus :status="migration.status" />
        </div>

        <div v-if="loading" class="meta-status muted">{{ t('書誌情報を読み込み中...', 'Loading bibliographic information...') }}</div>
        <div v-else-if="errorMessage" class="meta-status muted">{{ errorMessage }}</div>

        <div class="tab-row">
          <button class="button is-secondary" :class="{ 'is-active': activeTab === 'bib' }" type="button" @click="activeTab = 'bib'">{{ t('書誌', 'Bibliography') }}</button>
          <button class="button is-secondary" :class="{ 'is-active': activeTab === 'toc' }" type="button" @click="activeTab = 'toc'">{{ t('目次', 'TOC') }}</button>
          <button class="button is-secondary" :class="{ 'is-active': activeTab === 'text' }" type="button" @click="activeTab = 'text'">{{ t('本文', 'Full text') }}</button>
          <button class="button is-secondary" :class="{ 'is-active': activeTab === 'illustrations' }" type="button" @click="activeTab = 'illustrations'">{{ t('図表', 'Illustrations') }}</button>
        </div>

        <div class="tab-panel">
          <div v-if="activeTab === 'bib'" class="tab-content">
            <dl class="meta-list">
              <div>
                <dt>{{ t('責任表示', 'Responsibility') }}</dt>
                <dd>{{ book?.responsibility || '-' }}</dd>
              </div>
              <div>
                <dt>{{ t('出版年', 'Published year') }}</dt>
                <dd>{{ book?.publishyear || '-' }}</dd>
              </div>
              <div>
                <dt>{{ t('出版者', 'Publisher') }}</dt>
                <dd>{{ book?.publisher || '-' }}</dd>
              </div>
            </dl>
            <div class="dl-link">
              <a :href="`http://dl.ndl.go.jp/info:ndljp/pid/${id}`">{{ t('デジタルコレクションで見る', 'View in Digital Collections') }}</a>
            </div>
          </div>

          <div v-else-if="activeTab === 'toc'" class="tab-content">
            <button class="button is-secondary toc-toggle" type="button" @click="isMetadata = !isMetadata">{{ t('目次を切り替える', 'Switch TOC') }}</button>
            <p class="muted">
              {{ isMetadata ? t('デジタルコレクションの目次です', 'This is the Digital Collections TOC.') : t('自動解析された目次です（試験中）', 'This is an automatically analyzed TOC (experimental).') }}
            </p>
            <table v-if="isMetadata ? index : autoTOCindex" class="toc-table">
              <tbody>
                <tr v-for="item in isMetadata ? index : autoTOCindex" :key="`${item?.name}-${item?.pg}`">
                  <td>{{ item?.name }}</td>
                  <td class="pg">
                    <NuxtLink
                      v-if="item?.pg"
                      :to="{ name: 'book', params: { id }, query: { page: item.pg, keyword: keywords } }"
                    >
                      {{ item.pg }}{{ t('コマ', ' page') }}
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="muted">{{ isMetadata ? t('目次はありません。', 'No TOC is available.') : t('自動解析目次はありません。', 'No automatically analyzed TOC is available.') }}</p>
          </div>

          <BookPageSearch v-else-if="activeTab === 'text' && book" :book="book" :keywords="keywords" />
          <BookIllustrationSearch v-else-if="activeTab === 'illustrations' && book" :book="book" />
        </div>
      </aside>

      <section class="viewer-column">
        <IiifBookViewer :book="book" :manifest-url="manifestUrl" :page="page" :keywords="keywords" @update:page="page = $event" />
      </section>
    </section>
  </main>
</template>

<style scoped>
.book-view {
  background: #fff;
  overflow-x: hidden;
  width: 100%;
}

.book-columns {
  display: grid;
  grid-template-columns: minmax(240px, 23rem) minmax(0, 1fr);
  height: calc(100vh - 75px);
  max-width: 100vw;
  overflow: hidden;
  width: 100%;
}

.meta-column {
  background: #fff;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.meta-header {
  padding: 1rem;
}

.book-title {
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.35;
  margin: 0 0 0.75rem;
}

.meta-status {
  padding: 0 1rem 0.75rem;
}

.tab-row {
  display: grid;
  gap: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 0 1rem 1rem;
}

.tab-row .button {
  border-radius: 0;
  font-size: 0.92rem;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0.35rem 0.4rem;
  width: 100%;
}

.tab-row .button.is-active {
  background: #005eb8;
  color: #fff;
}

.tab-panel {
  height: calc(100vh - 175px);
  overflow-y: auto;
  padding: 0 1rem 1rem;
}

.tab-content {
  display: grid;
  gap: 0.9rem;
}

.meta-list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.meta-list div {
  display: grid;
  gap: 0.2rem;
}

.meta-list dt {
  color: #53657a;
  font-size: 0.86rem;
  font-weight: 700;
}

.meta-list dd {
  margin: 0;
}

.dl-link a {
  color: #005eb8;
  text-decoration: none;
}

.toc-toggle {
  justify-content: center;
}

.toc-table {
  border-collapse: collapse;
  width: 100%;
}

.toc-table td {
  border-bottom: 1px solid #e5ebf2;
  padding: 0.5rem 0;
  vertical-align: top;
}

.toc-table .pg {
  text-align: right;
  width: 4.5rem;
}

.toc-table a {
  color: #005eb8;
  text-decoration: none;
}

.muted {
  color: #6b7280;
  overflow-wrap: anywhere;
}

.viewer-column {
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 980px) {
  .book-columns {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }

  .tab-row .button {
    font-size: 0.82rem;
    min-height: 2.1rem;
    padding: 0.3rem 0.2rem;
  }

  .tab-panel {
    height: auto;
    max-height: 45vh;
  }
}
</style>
