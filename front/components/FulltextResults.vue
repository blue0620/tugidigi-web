<script setup lang="ts">
import type { Book, SearchResult } from '~/types/domain';

const route = useRoute();
const router = useRouter();
const { normalizeQuery } = useQueryParams();
const { searchBooks } = useSearchApi();

const result = ref<SearchResult<Book> | null>(null);
const loading = ref(false);
const error = ref('');

const from = computed(() => Math.max(0, Number(route.query.from || 0) || 0));
const size = computed(() => Math.max(1, Number(route.query.size || 10) || 10));
const sort = computed(() => String(route.query.sort || ''));

const reload = async () => {
  loading.value = true;
  error.value = '';

  try {
    result.value = await searchBooks(route.query, {
      from: String(from.value),
      size: String(size.value),
      sort: sort.value,
    });
  } catch (err) {
    console.error(err);
    error.value = '検索結果を取得できませんでした。';
    result.value = null;
  } finally {
    loading.value = false;
  }
};

watch(() => route.fullPath, reload, { immediate: true });

const updateQuery = (updates: Record<string, string | number | undefined>) => {
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
</script>

<template>
  <section class="panel result-panel">
    <div class="result-header">
      <div>
        <h2>検索結果</h2>
        <p v-if="result" class="muted">{{ result.hit.toLocaleString() }} 件</p>
      </div>
      <SearchControls :size="size" :sort="sort" show-sort @update="updateControls" />
    </div>

    <p v-if="loading" class="muted">検索しています...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <p v-else-if="result && !result.list.length" class="muted">該当する資料はありませんでした。</p>
    <ul v-else-if="result" class="result-list">
      <li v-for="book in result.list" :key="book.id" class="result-item">
        <BookResultCard :book="book" />
      </li>
    </ul>

    <SearchPagination
      v-if="result && result.hit > size"
      :total="result.hit"
      :from="from"
      :size="size"
      @change="updateQuery({ from: $event })"
    />
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
