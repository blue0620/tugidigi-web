<script setup lang="ts">
import type { Book, Illustration, SearchResult } from '~/types/domain';

const props = defineProps<{
  withoutImage?: boolean;
}>();

const route = useRoute();
const router = useRouter();
const { normalizeQuery } = useQueryParams();
const { searchBooks, searchNgramBooks, getIllustrationsByIds, getIllustrationsByBook } = useSearchApi();

const result = ref<SearchResult<Book> | null>(null);
const ngramResult = ref<SearchResult<Book> | null>(null);
const loading = ref(false);
const error = ref('');
const loadingNgram = ref(false);
const ngramLoaded = ref(false);
const showNgram = ref(false);

const from = computed(() => Math.max(0, Number(route.query.from || 0) || 0));
const size = computed(() => Math.max(1, Number(route.query.size || 10) || 10));
const sort = computed(() => String(route.query.sort || ''));
const facets = computed(() => result.value?.facets || []);

const loadIllustrations = async (books: Book[]) => {
  if (props.withoutImage) return;

  await Promise.all(
    books.map(async (book) => {
      try {
        book.illusts = book.illustrations?.length
          ? await getIllustrationsByIds(book.illustrations)
          : await getIllustrationsByBook(book.id);
      } catch (illustrationError) {
        console.error(illustrationError);
        book.illusts = [];
      }
    }),
  );
};

const reload = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await searchBooks(route.query, {
      from: String(from.value),
      size: String(size.value),
      sort: sort.value,
    });
    await loadIllustrations(response.list || []);
    result.value = response;
  } catch (err) {
    console.error(err);
    error.value = '検索結果を取得できませんでした。';
    result.value = null;
  } finally {
    loading.value = false;
  }
};

const loadNgram = async () => {
  if (ngramLoaded.value) return;

  loadingNgram.value = true;
  try {
    ngramResult.value = await searchNgramBooks(route.query, {
      from: '0',
      size: '100',
    });
    ngramLoaded.value = true;
  } catch (err) {
    console.error(err);
    ngramResult.value = null;
  } finally {
    loadingNgram.value = false;
  }
};

watch(
  () => route.fullPath,
  async () => {
    ngramLoaded.value = false;
    ngramResult.value = null;
    showNgram.value = false;
    await reload();
  },
  { immediate: true },
);

const updateQuery = (updates: Record<string, string | string[] | number | undefined>) => {
  router.push({
    name: 'fulltextsearch',
    query: normalizeQuery({
      ...route.query,
      ...updates,
    }),
  });
};

const updateControls = (value: { size: number; sort?: string }) => {
  updateQuery({
    from: undefined,
    size: value.size,
    sort: value.sort || undefined,
  });
};

const selectedFacetValues = (field: string) => {
  const raw = route.query[`fc-${field}`];
  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : typeof raw === 'string' ? [raw] : [];
};

const updateFacet = (field: string, values: string[] | undefined) => {
  updateQuery({
    from: undefined,
    [`fc-${field}`]: values,
  });
};

const keywords = computed(() => {
  const raw = route.query.keyword;
  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : typeof raw === 'string' ? [raw] : [];
});

const toggleNgram = async () => {
  showNgram.value = !showNgram.value;
  if (showNgram.value) await loadNgram();
};

const openIllustrationSearch = (illustration: Illustration) => {
  updateQuery({
    keyword: undefined,
    image: illustration.id,
    from: undefined,
  });
};
</script>

<template>
  <section class="fulltext-results">
    <div v-if="result" class="result-summary">
      <button class="summary-trigger" type="button" @click="toggleNgram">
        <span>{{ result.hit === 10000 ? '10,000+' : result.hit.toLocaleString() }}</span>
        <span>件</span>
      </button>
      <div v-if="showNgram" class="ngram-panel">
        <p v-if="loadingNgram" class="muted">Ngram を読み込み中...</p>
        <p v-else-if="!ngramResult?.list?.length" class="muted">Ngram データはありません。</p>
        <ul v-else class="ngram-list">
          <li v-for="item in ngramResult.list.slice(0, 20)" :key="item.id">
            <NuxtLink :to="{ name: 'book', params: { id: item.id }, query: keywords.length ? { keyword: keywords } : undefined }">
              {{ item.title || item.id }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <nav v-if="result?.hit" class="search-nav">
      <SearchPagination
        :total="result.hit"
        :from="from"
        :size="size"
        @change="updateQuery({ from: $event })"
      />
      <span class="nav-label">表示件数</span>
      <SearchControls :size="size" :sort="sort" show-sort @update="updateControls" />
    </nav>

    <p v-if="loading" class="muted">検索しています...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <p v-else-if="result && !result.list.length" class="muted no-hit">該当する資料はありませんでした。</p>

    <div v-else-if="result" class="result-layout">
      <aside v-if="facets.length" class="facet-column">
        <SearchFacetPanel
          v-for="facet in facets"
          :key="facet.field"
          :facet="facet"
          :selected="selectedFacetValues(facet.field)"
          @update="updateFacet(facet.field, $event)"
        />
      </aside>

      <div class="result-body">
        <div class="books">
          <BookResultCard
            v-for="book in result.list"
            :key="book.id"
            :book="book"
            :keywords="keywords"
            :show-illustrations="!withoutImage"
            @search-illustration="openIllustrationSearch"
          />
        </div>

        <nav class="bottom-pagination" v-if="result.hit > size">
          <SearchPagination
            :total="result.hit"
            :from="from"
            :size="size"
            @change="updateQuery({ from: $event })"
          />
        </nav>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fulltext-results {
  margin-top: 1.25rem;
}

.result-summary {
  margin-bottom: 0.85rem;
}

.summary-trigger {
  background: none;
  border: none;
  color: #334155;
  cursor: pointer;
  font-size: 0.92rem;
  padding: 0;
}

.ngram-panel {
  background: #f8fafc;
  border: 1px solid #d8dee8;
  margin-top: 0.5rem;
  padding: 0.8rem;
}

.ngram-list {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  padding-left: 1rem;
}

.search-nav {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.nav-label {
  color: #53657a;
  font-size: 0.9rem;
}

.error-text {
  color: #b3261e;
}

.no-hit {
  padding: 1rem 0;
  text-align: center;
}

.result-layout {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(210px, 250px) minmax(0, 1fr);
}

.facet-column {
  display: grid;
  align-content: start;
  gap: 0.8rem;
}

.result-body {
  min-width: 0;
}

.books {
  display: grid;
  gap: 1.6rem;
}

.bottom-pagination {
  margin-top: 1.25rem;
}

@media (max-width: 900px) {
  .result-layout {
    grid-template-columns: 1fr;
  }
}
</style>
