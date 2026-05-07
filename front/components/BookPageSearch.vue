<script setup lang="ts">
import type { Book, Page } from '~/types/domain';

const props = defineProps<{
  book: Book;
  keywords?: string[];
}>();

const route = useRoute();
const router = useRouter();
const { searchPages } = useSearchApi();
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

const keyword = ref((props.keywords || []).join(' '));
const result = ref<Page[] | null>(null);
const total = ref(0);
const from = ref(0);
const size = ref(20);
const loading = ref(false);

watch(
  () => props.keywords,
  (value) => {
    keyword.value = (value || []).join(' ');
  },
  { deep: true },
);

const keywords2 = computed(() => keyword.value.split(/[\s\u3000]+/).filter(Boolean));

const runSearch = async () => {
  if (!props.book?.id || !keywords2.value.length) {
    result.value = null;
    total.value = 0;
    return;
  }

  loading.value = true;
  try {
    const response = await searchPages({}, {
      from: String(from.value),
      size: String(size.value),
      'f-book': props.book.id,
      'q-contents': keywords2.value,
    });
    result.value = response.list || [];
    total.value = response.hit || 0;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.book?.id,
  () => {
    from.value = 0;
    runSearch();
  },
  { immediate: true },
);

const submit = async () => {
  from.value = 0;
  await runSearch();

  await router.replace({
    query: {
      ...route.query,
      keyword: keywords2.value.length ? keywords2.value : undefined,
    },
  });
};

const changePage = async (nextFrom: number) => {
  from.value = nextFrom;
  await runSearch();
};
</script>

<template>
  <section class="book-subpanel">
    <form class="inline-search" @submit.prevent="submit">
      <input v-model="keyword" class="input" type="text">
      <button class="button" type="submit">{{ t('検索', 'Search') }}</button>
    </form>

    <p v-if="loading" class="muted">{{ t('検索しています...', 'Searching...') }}</p>
    <template v-else-if="result">
      <p class="muted">{{ t(`${total} 件見つかりました。`, `${total} results found.`) }}</p>
      <SearchPagination v-if="total > size" :total="total" :from="from" :size="size" @change="changePage" />
      <div class="page-results">
        <article v-for="item in result" :key="item.id" class="page-result">
          <div class="page-number">
            <NuxtLink :to="{ name: 'book', params: { id: book.id }, query: { keyword: keywords2, page: item.page } }">
              {{ item.page }} {{ t('コマ', 'page') }}
            </NuxtLink>
          </div>
          <div class="page-highlights">
            <p v-for="highlight in item.highlights || []" :key="highlight" v-html="highlight" />
          </div>
        </article>
      </div>
      <SearchPagination v-if="total > size" :total="total" :from="from" :size="size" @change="changePage" />
    </template>
  </section>
</template>

<style scoped>
.book-subpanel {
  display: grid;
  gap: 0.9rem;
}

.inline-search {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: minmax(0, 1fr) auto;
}

.page-results {
  display: grid;
  gap: 0.8rem;
}

.page-result {
  border: 1px solid #dbe3ed;
  border-radius: 8px;
  display: grid;
  gap: 0.6rem;
  padding: 0.9rem;
}

.page-number a {
  color: #005eb8;
  font-weight: 700;
}

.page-highlights {
  display: grid;
  gap: 0.4rem;
}

.page-highlights :deep(mark) {
  background: #fff1a8;
}

@media (max-width: 680px) {
  .inline-search {
    grid-template-columns: 1fr;
  }
}
</style>
