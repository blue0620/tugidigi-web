<script setup lang="ts">
import type { Book, Illustration, SearchResult } from '~/types/domain';

const route = useRoute();
const router = useRouter();
const { normalizeQuery } = useQueryParams();
const { searchIllustrations, searchMetaBooks, getIllustrationsByIds, getIllustrationsByBook, getIllustration } = useSearchApi();

const illustrationResult = ref<SearchResult<Illustration> | null>(null);
const bookResult = ref<SearchResult<Book> | null>(null);
const loading = ref(false);
const error = ref('');
const qillust = ref<Illustration | null>(null);

const from = computed(() => Math.max(0, Number(route.query.from || 0) || 0));
const size = computed(() => Math.max(1, Number(route.query.size || 20) || 20));
const sort = computed(() => String(route.query.sort || ''));
const hasKeyword = computed(() => {
  const value = route.query.keyword;
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
});
const hasImageUrl = computed(() => {
  const value = route.query.imageurl;
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
});
const facets = computed(() => illustrationResult.value?.facets || []);
const querySignature = computed(() => JSON.stringify(route.query));

const loadBookIllustrations = async (books: Book[]) => {
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
    if (hasImageUrl.value) {
      illustrationResult.value = null;
      bookResult.value = null;
      qillust.value = null;
      return;
    }

    if (hasKeyword.value) {
      const books = await searchMetaBooks(route.query, {
        from: String(from.value),
        size: String(size.value),
      });
      await loadBookIllustrations(books.list || []);
      bookResult.value = books;
      illustrationResult.value = null;
      qillust.value = null;
      return;
    }

    const illustrations = await searchIllustrations(route.query, {
      from: String(from.value),
      size: String(size.value),
      sort: sort.value,
    });
    illustrationResult.value = illustrations;
    bookResult.value = null;

    const imageId = String(route.query.image || '');
    qillust.value = imageId ? await getIllustration(imageId) : null;
  } catch (err) {
    console.error(err);
    error.value = '検索結果を取得できませんでした。';
    illustrationResult.value = null;
    bookResult.value = null;
    qillust.value = null;
  } finally {
    loading.value = false;
  }
};

watch(
  () => querySignature.value,
  async () => {
    await reload();
  },
  { immediate: true },
);

const updateQuery = async (updates: Record<string, string | string[] | number | undefined>) => {
  const nextQuery = normalizeQuery({
    ...route.query,
    ...updates,
  });

  await router.replace({
    path: route.path,
    query: nextQuery,
  });

  if (querySignature.value === JSON.stringify(nextQuery)) {
    await reload();
  }
};

const updateControls = async (value: { size: number; sort?: string }) => {
  await updateQuery({
    from: undefined,
    size: value.size,
    sort: value.sort || undefined,
  });
};

const selectedFacetValues = (field: string) => {
  const raw = route.query[`fc-${field}`];
  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : typeof raw === 'string' ? [raw] : [];
};

const updateFacet = async (field: string, values: string[] | undefined) => {
  await updateQuery({
    from: undefined,
    [`fc-${field}`]: values,
  });
};

const openImageSearch = async (illustration: Illustration) => {
  await updateQuery({
    keyword: undefined,
    imageurl: undefined,
    keyword2vec: undefined,
    image: illustration.id,
    from: undefined,
  });
};

const openTagSearch = async (payload: { illustration: Illustration; tag: string }) => {
  await updateQuery({
    keyword: undefined,
    imageurl: undefined,
    keyword2vec: undefined,
    image: payload.illustration.id,
    'fc-graphictags.tagname': [payload.tag],
    from: undefined,
  });
};

const bookKeywords = computed(() => {
  const value = route.query.keyword;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : [];
});
</script>

<template>
  <section class="result-panel">
    <div v-if="loading" class="panel muted">検索中です。しばらくお待ちください。</div>
    <div v-else-if="error" class="panel error-text">{{ error }}</div>
    <div v-else-if="hasImageUrl"></div>

    <template v-else-if="illustrationResult">
      <div v-if="!illustrationResult.hit" class="panel muted no-hit">該当する画像はありませんでした。</div>
      <template v-else>
        <nav class="search-nav">
          <div class="left-meta">{{ illustrationResult.hit.toLocaleString() }}件</div>
          <div class="right-meta">
            <SearchPagination :total="illustrationResult.hit" :from="from" :size="size" @change="updateQuery({ from: $event })" />
            <SearchControls :size="size" :sort="sort" @update="updateControls" />
          </div>
        </nav>

        <div class="result-layout">
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
            <div v-if="qillust" class="query-illust">
              <IllustrationResultCard :illustration="qillust" compact />
            </div>
            <div class="masonry-grid">
              <IllustrationResultCard
                v-for="illustration in illustrationResult.list"
                :key="illustration.id"
                :illustration="illustration"
                @search="openImageSearch"
                @search-tag="openTagSearch"
              />
            </div>
          </div>
        </div>

        <nav class="bottom-pagination">
          <SearchPagination :total="illustrationResult.hit" :from="from" :size="size" @change="updateQuery({ from: $event })" />
        </nav>
      </template>
    </template>

    <template v-else-if="bookResult">
      <nav v-if="bookResult.hit" class="search-nav">
        <div class="left-meta">{{ bookResult.hit.toLocaleString() }}件</div>
        <div class="right-meta">
          <SearchPagination :total="bookResult.hit" :from="from" :size="size" @change="updateQuery({ from: $event })" />
          <SearchControls :size="size" @update="updateControls" />
        </div>
      </nav>

      <div v-if="!bookResult.hit" class="panel muted no-hit">該当する資料はありませんでした。</div>
      <div v-else class="book-result-list">
        <BookResultCard
          v-for="book in bookResult.list"
          :key="book.id"
          :book="book"
          :keywords="bookKeywords"
          show-illustrations
          @search-illustration="openImageSearch"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.result-panel {
  margin-top: 1rem;
}

.panel {
  padding: 1rem 0;
}

.search-nav {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  padding-left: 1rem;
  padding-right: 1rem;
  margin-bottom: 1rem;
}

.right-meta {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
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

.query-illust {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  max-width: 250px;
}

.masonry-grid {
  column-gap: 10px;
  column-width: 320px;
}

.masonry-grid :deep(.illust-card) {
  break-inside: avoid;
  margin-bottom: 10px;
}

.result-body {
  background: #fff;
  min-height: 1px;
}

.book-result-list {
  display: grid;
  gap: 1.5rem;
}

.bottom-pagination {
  margin-top: 1rem;
}

.error-text {
  color: #b3261e;
}

.no-hit {
  text-align: center;
}

@media (max-width: 900px) {
  .result-layout {
    grid-template-columns: 1fr;
  }
}
</style>
