<script setup lang="ts">
definePageMeta({ name: 'illustsearch' });

const route = useRoute();
const router = useRouter();
const migration = useRouteMigration('illustsearch');
const { normalizeQuery } = useQueryParams();
const runtimeConfig = useRuntimeConfig();
const { $notify } = useNuxtApp();

const activeTab = ref<'keyword' | 'image' | 'url'>('keyword');
const keyword = ref(String(route.query.keyword || ''));
const imageId = ref(String(route.query.image || ''));
const targetUrl = ref(String(route.query.imageurl || ''));

const searchByKeyword = async () => {
  const keywords = keyword.value.split(/[\s\u3000]+/).filter(Boolean);
  if (!keywords.length) {
    $notify('検索キーワードを入力してください。', 'error');
    return;
  }
  await router.push({ name: 'illustsearchres', query: normalizeQuery({ keyword: keywords }) });
};

const searchByImage = async () => {
  if (!imageId.value) {
    $notify('画像 ID を入力してください。', 'error');
    return;
  }
  await router.push({ name: 'illustsearchres', query: normalizeQuery({ image: imageId.value }) });
};

const searchByUrl = async () => {
  if (!targetUrl.value) {
    $notify('画像 URL を入力してください。', 'error');
    return;
  }
  await router.push({ name: 'illustsearchres', query: normalizeQuery({ imageurl: targetUrl.value }) });
};
</script>

<template>
  <main class="page-shell">
    <div class="page-title-row">
      <div>
        <h1>画像検索</h1>
        <p class="lead">旧 IllustSearch の入口を Nuxt3 へ移植し、検索条件は既存の `/illust/search` query 形式へ送ります。</p>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <section class="panel">
      <div class="tabs">
        <button type="button" :class="{ 'is-active': activeTab === 'keyword' }" @click="activeTab = 'keyword'">
          キーワード
        </button>
        <button type="button" :class="{ 'is-active': activeTab === 'image' }" @click="activeTab = 'image'">
          画像 ID
        </button>
        <button type="button" :class="{ 'is-active': activeTab === 'url' }" @click="activeTab = 'url'">
          画像 URL
        </button>
      </div>

      <form v-if="activeTab === 'keyword'" class="grid" @submit.prevent="searchByKeyword">
        <div class="field">
          <label for="illust-keyword">キーワード</label>
          <input id="illust-keyword" v-model="keyword" class="input" autocomplete="off">
        </div>
        <button class="button" type="submit">画像を検索</button>
      </form>

      <form v-else-if="activeTab === 'image'" class="grid" @submit.prevent="searchByImage">
        <div class="field">
          <label for="image-id">画像 ID</label>
          <input id="image-id" v-model="imageId" class="input" autocomplete="off">
        </div>
        <button class="button" type="submit">この画像で検索</button>
      </form>

      <form v-else class="grid" @submit.prevent="searchByUrl">
        <div class="field">
          <label for="image-url">画像 URL</label>
          <input id="image-url" v-model="targetUrl" class="input" type="url" autocomplete="off">
        </div>
        <p class="muted">画像特徴抽出 API: {{ runtimeConfig.public.imageFeaturesEndpoint }}</p>
        <button class="button" type="submit">URL で検索</button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.tabs {
  border-bottom: 1px solid #dbe3ed;
  display: flex;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.tabs button {
  background: transparent;
  border: 0;
  border-bottom: 3px solid transparent;
  color: #53657a;
  cursor: pointer;
  padding: 0.75rem 0.9rem;
}

.tabs button.is-active {
  border-color: #005eb8;
  color: #005eb8;
  font-weight: 800;
}
</style>
