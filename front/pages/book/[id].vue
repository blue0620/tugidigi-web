<script setup lang="ts">
import type { Book } from '~/types/domain';

definePageMeta({ name: 'book' });

const route = useRoute();
const router = useRouter();
const migration = useRouteMigration('book');
const id = computed(() => String(route.params.id || ''));
const page = computed({
  get: () => Number(route.query.page || 1),
  set: (nextPage: number) => {
    router.replace({ query: { ...route.query, page: String(nextPage) } });
  },
});
const keywords = computed(() => {
  const value = route.query.keyword;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return typeof value === 'string' && value ? [value] : [];
});

const book = ref<Book | null>(null);
const loading = ref(false);
const errorMessage = ref('');

const loadBook = async () => {
  if (!id.value) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    book.value = await useApiFetch<Book>(`/book/${id.value}`);
  } catch (error) {
    errorMessage.value = '書誌情報を取得できませんでした。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const manifestUrl = computed(() => `https://www.dl.ndl.go.jp/api/iiif/${id.value}/manifest.json`);

const storeHistory = () => {
  if (!import.meta.client || !id.value) return;
  const key = 'viewed_book_history';
  const history = (localStorage.getItem(key) || '').split(',').filter(Boolean);
  const nextHistory = [id.value, ...history.filter((item) => item !== id.value)].slice(0, 100);
  localStorage.setItem(key, nextHistory.join(','));
};

onMounted(async () => {
  storeHistory();
  await loadBook();
});
</script>

<template>
  <main class="page-shell">
    <div class="page-title-row">
      <div>
        <h1>{{ book?.title || `資料 ${id}` }}</h1>
        <p class="lead">Book ルートを Nuxt3 Composition API へ移植中です。IIIF viewer は次の段階で分離移植します。</p>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <section class="panel book-layout">
      <div class="viewer-placeholder">
        <strong>IIIF viewer migration slot</strong>
        <span>page {{ page || 1 }}</span>
      </div>
      <div class="grid">
        <p v-if="loading" class="muted">Loading book metadata...</p>
        <p v-else-if="errorMessage" class="muted">{{ errorMessage }}</p>
        <dl class="meta-list">
          <div>
            <dt>ID</dt>
            <dd>{{ id }}</dd>
          </div>
          <div>
            <dt>出版年</dt>
            <dd>{{ book?.publishyear || '-' }}</dd>
          </div>
          <div>
            <dt>キーワード</dt>
            <dd>{{ keywords.join(', ') || '-' }}</dd>
          </div>
          <div>
            <dt>IIIF manifest</dt>
            <dd><a :href="manifestUrl">{{ manifestUrl }}</a></dd>
          </div>
        </dl>
        <div class="button-row">
          <button class="button is-secondary" type="button" @click="page = Math.max(1, (page || 1) - 1)">前へ</button>
          <button class="button is-secondary" type="button" @click="page = (page || 1) + 1">次へ</button>
          <NuxtLink class="button" :to="{ name: 'illustsearchres', query: { image: book?.illustrations || [] } }">
            図版検索へ
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.book-layout {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
}

.viewer-placeholder {
  align-items: center;
  aspect-ratio: 4 / 3;
  background: #1f3146;
  border-radius: 8px;
  color: #ffffff;
  display: grid;
  justify-items: center;
  padding: 1rem;
}

.viewer-placeholder span {
  color: #b9c6d6;
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
  overflow-wrap: anywhere;
}

@media (max-width: 860px) {
  .book-layout {
    grid-template-columns: 1fr;
  }
}
</style>
