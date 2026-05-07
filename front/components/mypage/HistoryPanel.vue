<script setup lang="ts">
import type { Book, Illustration } from '~/types/domain';
import { retreiveViewedBookHistory, tryLocalStorageAvailable } from '~/utils/mypage-storage';
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

const route = useRoute();
const router = useRouter();
const { normalizeQuery } = useQueryParams();
const { searchBooks, getIllustrationsByIds, getIllustrationsByBook } = useSearchApi();

const viewedBookHistoryIds = ref<string[]>([]);
const result = ref<{ list: Book[]; hit: number } | null>(null);
const loading = ref(false);
const isLocalStorageAvailable = ref(true);
const keywordBuffer = ref('');

const keyword = computed(() => {
  const value = route.query.history_keyword;
  return Array.isArray(value) ? (value[0] || '') : typeof value === 'string' ? value : '';
});

const currentPage = computed(() => {
  const value = Number(Array.isArray(route.query.history_page) ? route.query.history_page[0] : route.query.history_page || 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
});

const pageSize = 5;
const pageFrom = computed(() => (currentPage.value - 1) * pageSize);
const sortedBookList = computed(
  () =>
    viewedBookHistoryIds.value
      .map((id) => result.value?.list.find((book) => book.id === id))
      .filter((book): book is Book => Boolean(book)),
);
const querySignature = computed(() => JSON.stringify({
  history_page: route.query.history_page || '',
  history_keyword: route.query.history_keyword || '',
}));

const loadIllustrations = async (books: Book[]) => {
  await Promise.all(
    books.map(async (book) => {
      try {
        book.illusts = book.illustrations?.length
          ? await getIllustrationsByIds(book.illustrations)
          : await getIllustrationsByBook(book.id);
      } catch {
        book.illusts = [];
      }
    }),
  );
};

const reloadHistory = async () => {
  isLocalStorageAvailable.value = tryLocalStorageAvailable();
  if (!isLocalStorageAvailable.value) return;

  viewedBookHistoryIds.value = retreiveViewedBookHistory();
  keywordBuffer.value = keyword.value;

  if (!viewedBookHistoryIds.value.length) {
    result.value = { list: [], hit: 0 };
    return;
  }

  const query: Record<string, string | string[]> = {
    'f-id': viewedBookHistoryIds.value,
    from: String(pageFrom.value),
    size: String(pageSize),
  };

  if (keyword.value.length > 1) {
    query.keyword = keyword.value.split(/[\s　]+/).filter(Boolean);
  }

  loading.value = true;
  try {
    const response = await searchBooks({}, query);
    await loadIllustrations(response.list || []);
    result.value = response;
  } finally {
    loading.value = false;
  }
};

const updateQuery = async (updates: Record<string, string | number | undefined>) => {
  const nextQuery = normalizeQuery({
    ...route.query,
    ...updates,
  });

  await router.replace({
    path: route.path,
    query: nextQuery,
    hash: '#viewed-book-history',
  });

  if (querySignature.value === JSON.stringify({
    history_page: nextQuery.history_page || '',
    history_keyword: nextQuery.history_keyword || '',
  })) {
    await reloadHistory();
  }
};

const submitKeywordSearch = async () => {
  await updateQuery({
    history_page: '1',
    history_keyword: keywordBuffer.value || undefined,
  });
};

const openIllustrationSearch = async (illustration: Illustration) => {
  await navigateTo({
    name: 'illustsearchres',
    query: { image: illustration.id },
  });
};

watch(
  () => querySignature.value,
  async () => {
    await reloadHistory();
  },
  { immediate: true },
);
</script>

<template>
  <div class="history-content">
    <div v-if="!isLocalStorageAvailable" class="search-result-body">
      <p>{{ t('このブラウザでは閲覧履歴機能が利用できません。Localstorage機能を有効にしてください', 'Viewing history is not available in this browser. Please enable localStorage.') }}</p>
    </div>
    <div v-else-if="!viewedBookHistoryIds.length" class="search-result-body">
      <p><NuxtLink to="/fulltext">{{ t('こちらのページ', 'this page') }}</NuxtLink>{{ t('から資料を検索できます', ' to search for materials') }}</p>
    </div>
    <template v-else>
      <form class="text-search-form" @submit.prevent="submitKeywordSearch">
        <label class="field-label">{{ t('閲覧履歴の資料を全文検索する（スニペット表示には対応していません）', 'Search full text within viewing history (snippet display is not supported).') }}</label>
        <div class="search-row">
          <input
            v-model="keywordBuffer"
            class="search-input"
            type="text"
            :placeholder="t('複数語句は空白区切りで入力してください', 'Separate multiple keywords with spaces')"
          >
          <button class="search-button" type="submit">
            <span class="mdi mdi-magnify" aria-hidden="true"></span>
          </button>
        </div>
      </form>

      <div class="search-result-body">
        <p v-if="loading" class="status-text">{{ t('読み込み中...', 'Loading...') }}</p>
        <div v-else class="book-list">
          <BookResultCard
            v-for="book in sortedBookList"
            :key="book.id"
            :book="book"
            :show-illustrations="true"
            @search-illustration="openIllustrationSearch"
          />
        </div>
      </div>

      <SearchPagination
        v-if="(result?.hit || 0) > pageSize"
        :total="result?.hit || 0"
        :from="pageFrom"
        :size="pageSize"
        @change="updateQuery({ history_page: Math.floor($event / pageSize) + 1 })"
      />
    </template>
  </div>
</template>

<style scoped>
.search-result-body {
  background: #fff;
  padding: 2rem;
}

.text-search-form {
  margin-bottom: 1.25rem;
}

.field-label {
  color: #334155;
  display: block;
  font-size: 0.95rem;
  margin-bottom: 0.55rem;
}

.search-row {
  display: flex;
  gap: 0.4rem;
}

.search-input {
  border: 1px solid #cbd5e1;
  flex: 1 1 auto;
  font: inherit;
  min-height: 2.5rem;
  padding: 0.55rem 0.75rem;
}

.search-button {
  align-items: center;
  background: #0f766e;
  border: 1px solid #0f766e;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  min-height: 2.5rem;
  min-width: 2.75rem;
}

.search-button .mdi {
  font-size: 1.1rem;
}

.status-text {
  margin: 0;
}

.book-list {
  display: grid;
  gap: 1.5rem;
}
</style>
