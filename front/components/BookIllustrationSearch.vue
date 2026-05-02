<script setup lang="ts">
import type { Book, Illustration, ItemFacet } from '~/types/domain';

const props = defineProps<{
  book: Book;
}>();

const router = useRouter();
const { searchBookIllustrations } = useSearchApi();

const result = ref<Illustration[] | null>(null);
const facets = ref<ItemFacet[]>([]);
const total = ref(0);
const from = ref(0);
const size = ref(20);
const loading = ref(false);
const facetState = ref<Record<string, string[]>>({});

const runSearch = async () => {
  if (!props.book?.id) return;

  loading.value = true;
  try {
    const overrides: Record<string, string | string[]> = {
      from: String(from.value),
      size: String(size.value),
      sort: 'page:ASC',
      'f-pid': props.book.id,
    };

    Object.entries(facetState.value).forEach(([key, values]) => {
      if (values.length) overrides[`fc-${key}`] = values;
    });

    const response = await searchBookIllustrations({}, overrides);
    result.value = response.list || [];
    facets.value = response.facets || [];
    total.value = response.hit || 0;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.book?.id,
  () => {
    from.value = 0;
    facetState.value = {};
    runSearch();
  },
  { immediate: true },
);

const openBookPage = (item: Illustration) => {
  router.push({
    name: 'book',
    params: { id: item.pid },
    query: { page: String(item.page || 1) },
  });
};

const openIllustrationSearch = (item: Illustration) => {
  router.push({
    name: 'illustsearchres',
    query: { image: [item.id] },
  });
};

const changePage = async (nextFrom: number) => {
  from.value = nextFrom;
  await runSearch();
};

const updateFacet = async (field: string, values: string[] | undefined) => {
  from.value = 0;
  facetState.value = {
    ...facetState.value,
    [field]: values || [],
  };
  await runSearch();
};
</script>

<template>
  <section class="book-subpanel">
    <p v-if="loading" class="muted">検索しています...</p>
    <template v-else-if="result">
      <p class="muted">{{ total }} 枚の図表が抽出されています</p>
      <div v-if="facets.length" class="facet-strip">
        <SearchFacetPanel
          v-for="facet in facets"
          :key="facet.field"
          :facet="facet"
          :selected="facetState[facet.field] || []"
          :default-length="5"
          @update="updateFacet(facet.field, $event)"
        />
      </div>
      <SearchPagination v-if="total > size" :total="total" :from="from" :size="size" @change="changePage" />
      <div class="illust-grid">
        <article v-for="item in result" :key="item.id" class="illust-card">
          <div @click="openBookPage(item)">
            <IllustrationResultCard :illustration="item" />
          </div>
          <div class="illust-actions">
            <button class="button is-secondary" type="button" @click="openIllustrationSearch(item)">画像検索</button>
            <span class="muted">{{ item.page }} コマ</span>
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

.facet-strip {
  display: grid;
  gap: 0.8rem;
}

.illust-grid {
  display: grid;
  gap: 0.9rem;
}

.illust-card {
  border: 1px solid #dbe3ed;
  border-radius: 8px;
  padding: 0.75rem;
}

.illust-actions {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  margin-top: 0.65rem;
}
</style>
