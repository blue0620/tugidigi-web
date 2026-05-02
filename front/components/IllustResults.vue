<script setup lang="ts">
import type { Book, Illustration, SearchResult } from '~/types/domain';

const route = useRoute();
const router = useRouter();
const { normalizeQuery } = useQueryParams();
const { searchIllustrations, searchMetaBooks } = useSearchApi();

const illustrationResult = ref<SearchResult<Illustration> | null>(null);
const bookResult = ref<SearchResult<Book> | null>(null);
const loading = ref(false);
const error = ref('');

const from = computed(() => Math.max(0, Number(route.query.from || 0) || 0));
const size = computed(() => Math.max(1, Number(route.query.size || 20) || 20));
const hasKeyword = computed(() => {
  const value = route.query.keyword;

  return Array.isArray(value) ? value.length > 0 : Boolean(value);
});

const reload = async () => {
  loading.value = true;
  error.value = '';

  try {
    const [illustrations, books] = await Promise.all([
      searchIllustrations(route.query, {
        from: String(from.value),
        size: String(size.value),
      }),
      hasKeyword.value
        ? searchMetaBooks(route.query, {
            from: '0',
            size: '5',
          })
        : Promise.resolve(null),
    ]);

    illustrationResult.value = illustrations;
    bookResult.value = books;
  } catch (err) {
    console.error(err);
    error.value = '検索結果を取得できませんでした。';
    illustrationResult.value = null;
    bookResult.value = null;
  } finally {
    loading.value = false;
  }
};

watch(() => route.fullPath, reload, { immediate: true });

const updateQuery = (updates: Record<string, string | number | undefined>) => {
  router.push({
    name: 'illustsearchres',
    query: normalizeQuery({
      ...route.query,
      ...updates,
    }),
  });
};

const updateControls = (value: { size: number }) => {
  updateQuery({
    from: undefined,
    size: value.size,
  });
};
</script>

<template>
  <section class="panel result-panel">
    <div class="result-header">
      <div>
        <h2>画像検索結果</h2>
        <p v-if="illustrationResult" class="muted">{{ illustrationResult.hit.toLocaleString() }} 件</p>
      </div>
      <SearchControls :size="size" @update="updateControls" />
    </div>

    <p v-if="loading" class="muted">検索しています...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <p v-else-if="illustrationResult && !illustrationResult.list.length" class="muted">該当する画像はありませんでした。</p>
    <ul v-else-if="illustrationResult" class="result-list illustration-list">
      <li v-for="illustration in illustrationResult.list" :key="illustration.id" class="result-item">
        <IllustrationResultCard :illustration="illustration" />
      </li>
    </ul>

    <SearchPagination
      v-if="illustrationResult && illustrationResult.hit > size"
      :total="illustrationResult.hit"
      :from="from"
      :size="size"
      @change="updateQuery({ from: $event })"
    />
  </section>

  <section v-if="bookResult && bookResult.list.length" class="panel result-panel">
    <h2>関連資料</h2>
    <ul class="result-list">
      <li v-for="book in bookResult.list" :key="book.id" class="result-item">
        <BookResultCard :book="book" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.result-panel {
  margin-top: 1rem;
}

.result-header {
  align-items: flex-start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

h2 {
  margin: 0;
}

.error-text {
  color: #b3261e;
}

@media (max-width: 760px) {
  .result-header {
    display: grid;
  }
}
</style>
