<script setup lang="ts">
import type { Illustration, SearchResult } from '~/types/domain';

const props = defineProps<{
  qillust?: Illustration | null;
  initialKeyword?: string;
  initialUrl?: string;
  initialKeyword2vec?: string;
  initialTab?: 'sample' | 'metadata' | 'local' | 'url' | 'words';
}>();

const route = useRoute();
const router = useRouter();
const runtimeConfig = useRuntimeConfig();
const { normalizeQuery } = useQueryParams();
const { $notify } = useNuxtApp();
const {
  getDefaultIllustrations,
  getIllustration,
  getRandomIllustrationsWithFacet,
  searchIllustrationsByFeature,
  searchIllustrationsByTextFeature,
} = useSearchApi();

const activeTab = ref<'sample' | 'metadata' | 'local' | 'url' | 'words'>(props.initialTab || 'sample');
const keyword = ref(props.initialKeyword || '');
const targetUrl = ref(props.initialUrl || '');
const keyword2vec = ref(props.initialKeyword2vec || '');
const sampleIllustrations = ref<Illustration[]>([]);
const localImage = ref('');
const localResults = ref<SearchResult<Illustration> | null>(null);
const localLoading = ref(false);
const localError = ref('');
const selectedSample = ref<Illustration | null>(props.qillust || null);

watch(
  () => [props.initialKeyword, props.initialUrl, props.initialKeyword2vec, props.initialTab, props.qillust],
  () => {
    keyword.value = props.initialKeyword || '';
    targetUrl.value = props.initialUrl || '';
    keyword2vec.value = props.initialKeyword2vec || '';
    activeTab.value = props.initialTab || 'sample';
    selectedSample.value = props.qillust || null;
  },
);

const loadDefaultIllustrations = async () => {
  try {
    sampleIllustrations.value = await getDefaultIllustrations();
  } catch (error) {
    console.error(error);
    sampleIllustrations.value = [];
  }
};

onMounted(loadDefaultIllustrations);

watch(
  () => route.query.image,
  async (value) => {
    const imageId = Array.isArray(value) ? value[0] : value;
    if (!imageId) {
      selectedSample.value = props.qillust || null;
      return;
    }
    try {
      selectedSample.value = await getIllustration(String(imageId));
    } catch (error) {
      console.error(error);
    }
  },
  { immediate: true },
);

const openResultPage = async (query: Record<string, string | string[] | undefined>) => {
  await router.push({
    name: 'illustsearchres',
    query: normalizeQuery(query),
  });
};

const searchBySample = async (illustration: Illustration) => {
  await openResultPage({
    image: illustration.id,
    'fc-graphictags.tagname': illustration.graphictags?.map((item) => item.tagname) || undefined,
  });
};

const searchByKeyword = async (presetKeywords?: string[]) => {
  const keywords = (presetKeywords || keyword.value.split(/[\s\u3000]+/).filter(Boolean));
  if (!keywords.length) {
    $notify('検索キーワードを入力してください。', 'error');
    return;
  }
  await openResultPage({ keyword: keywords });
};

const searchByUrl = async () => {
  if (!targetUrl.value) {
    $notify('画像 URL を入力してください。', 'error');
    return;
  }
  await openResultPage({ imageurl: targetUrl.value });
};

const searchByWords = async () => {
  if (!keyword2vec.value.trim()) {
    $notify('言葉を入力してください。', 'error');
    return;
  }
  await openResultPage({ keyword2vec: keyword2vec.value.trim() });
};

const reloadSample = async (facet: 'picture' | 'graphic') => {
  try {
    sampleIllustrations.value = await getRandomIllustrationsWithFacet(facet);
  } catch (error) {
    console.error(error);
  }
};

const selectFile = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    localImage.value = String(reader.result || '');
    localResults.value = null;
    localError.value = '';
  };
  reader.readAsDataURL(file);
};

const analyzeLocalImage = async () => {
  if (!localImage.value) return;
  localLoading.value = true;
  localError.value = '';
  try {
    const response = await fetch(String(runtimeConfig.public.imageFeaturesEndpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ img_b64: localImage.value }),
    });
    const payload = await response.json();
    const features = payload?.body;
    if (!features) {
      localError.value = '画像を解析できませんでした。';
      return;
    }
    localResults.value = await searchIllustrationsByFeature(features);
  } catch (error) {
    console.error(error);
    localError.value = '画像検索に失敗しました。';
  } finally {
    localLoading.value = false;
  }
};

const clearLocalImage = () => {
  localImage.value = '';
  localResults.value = null;
  localError.value = '';
};

const searchWithTag = async (illustration: Illustration, tag: string) => {
  await openResultPage({
    image: illustration.id,
    'fc-graphictags.tagname': [tag],
  });
};

const topTags = (illustration: Illustration) => (
  illustration.graphictags?.slice().sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 3) || []
);
</script>

<template>
  <section class="illust-search-panel">
    <h1 class="page-title">画像検索</h1>

    <div class="tab-row">
      <button type="button" :class="{ 'is-active': activeTab === 'sample' }" @click="activeTab = 'sample'">サンプル画像から</button>
      <button type="button" :class="{ 'is-active': activeTab === 'metadata' }" @click="activeTab = 'metadata'">資料のタイトルや目次から</button>
      <button type="button" :class="{ 'is-active': activeTab === 'local' }" @click="activeTab = 'local'">手元の画像から</button>
      <button type="button" :class="{ 'is-active': activeTab === 'url' }" @click="activeTab = 'url'">URLから</button>
      <button type="button" :class="{ 'is-active': activeTab === 'words' }" @click="activeTab = 'words'">言葉から</button>
    </div>

    <section v-if="activeTab === 'sample'" class="panel-block">
      <p class="guide" :class="{ 'is-hidden': selectedSample }">サンプルの中から検索したい画像を選んでください。似た図表を含む資料を検索します。</p>
      <div v-if="selectedSample" class="query-illustration">
        <IllustrationResultCard :illustration="selectedSample" compact />
      </div>
      <div v-else class="sample-grid">
        <button v-for="item in sampleIllustrations" :key="item.id" class="sample-card" type="button" @click="searchBySample(item)">
          <img :src="`https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(item.pid)}/R${String(item.page || 1).padStart(7, '0')}/full/,180/0/default.jpg`" alt="" loading="lazy">
        </button>
      </div>
      <div class="reload-row">
        <button class="button" type="button" @click="reloadSample('picture')">写真を替える</button>
        <button class="button" type="button" @click="reloadSample('graphic')">図版を替える</button>
      </div>
    </section>

    <section v-else-if="activeTab === 'metadata'" class="panel-block">
      <p class="guide">検索したいキーワードを入力してください。関連する資料の画像を検索できます。</p>
      <form class="search-form" @submit.prevent="searchByKeyword()">
        <div class="search-input-row">
          <input v-model="keyword" class="input" type="text" autocomplete="off">
          <button class="button" type="submit">検索</button>
        </div>
        <div class="preset-row">
          <span>キーワード例</span>
          <button type="button" @click="searchByKeyword(['肖像'])">肖像</button>
          <button type="button" @click="searchByKeyword(['動物'])">動物</button>
          <button type="button" @click="searchByKeyword(['風景'])">風景</button>
          <button type="button" @click="searchByKeyword(['植物'])">植物</button>
          <button type="button" @click="searchByKeyword(['古地図'])">古地図</button>
        </div>
      </form>
    </section>

    <section v-else-if="activeTab === 'local'" class="panel-block">
      <div class="upload-area">
        <input type="file" accept="image/*" @change="selectFile">
      </div>
      <div v-if="localImage" class="local-preview">
        <img :src="localImage" alt="">
        <div class="local-actions">
          <button class="button" type="button" @click="analyzeLocalImage">解析して検索</button>
          <button class="button is-secondary" type="button" @click="clearLocalImage">クリア</button>
        </div>
      </div>
      <p v-if="localLoading" class="muted">画像を解析しています...</p>
      <p v-else-if="localError" class="error-text">{{ localError }}</p>
      <div v-else-if="localResults?.list?.length" class="sample-grid inline-results">
        <article v-for="item in localResults.list" :key="item.id" class="inline-result-card">
          <button class="image-only" type="button" @click="openResultPage({ image: item.id })">
            <img :src="`https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(item.pid)}/R${String(item.page || 1).padStart(7, '0')}/full/,180/0/default.jpg`" alt="">
          </button>
          <div class="inline-tags">
            <button v-for="tag in topTags(item)" :key="tag.tagname" type="button" @click="searchWithTag(item, tag.tagname)">{{ tag.tagname }}</button>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'url'" class="panel-block">
      <p class="guide">検索したい画像の URL を入力してください。</p>
      <form class="search-form" @submit.prevent="searchByUrl">
        <div class="search-input-row">
          <input v-model="targetUrl" class="input" type="url" autocomplete="off">
          <button class="button" type="submit">検索</button>
        </div>
      </form>
    </section>

    <section v-else class="panel-block">
      <p class="guide">探したい画像をイメージして、言葉を入力してください。</p>
      <form class="search-form" @submit.prevent="searchByWords">
        <div class="search-input-row">
          <input v-model="keyword2vec" class="input" type="text" autocomplete="off">
          <button class="button" type="submit">検索</button>
        </div>
      </form>
    </section>
  </section>
</template>

<style scoped>
.page-title {
  margin-bottom: 1rem;
}

.tab-row {
  border-bottom: 1px solid #dbe3ed;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tab-row button {
  background: transparent;
  border: 0;
  border-bottom: 3px solid transparent;
  color: #53657a;
  cursor: pointer;
  padding: 0.75rem 0.9rem;
}

.tab-row button.is-active {
  border-color: #005eb8;
  color: #005eb8;
  font-weight: 800;
}

.panel-block {
  padding-top: 1rem;
}

.guide {
  color: #4b5563;
  line-height: 1.7;
  margin: 0 0 0.9rem;
}

.guide.is-hidden {
  visibility: hidden;
}

.sample-grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.sample-card,
.image-only {
  background: #fff;
  border: 1px solid #d8dee8;
  cursor: pointer;
  padding: 0.4rem;
}

.sample-card img,
.image-only img,
.local-preview img {
  display: block;
  max-width: 100%;
  width: 100%;
}

.reload-row,
.local-actions,
.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.9rem;
}

.search-input-row {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: minmax(0, 1fr) auto;
}

.preset-row button {
  background: none;
  border: 0;
  color: #005eb8;
  cursor: pointer;
  padding: 0;
}

.upload-area {
  border: 1px dashed #b9c6d8;
  padding: 1rem;
}

.local-preview {
  display: grid;
  gap: 0.8rem;
  margin-top: 1rem;
  max-width: 360px;
}

.inline-results {
  margin-top: 1rem;
}

.inline-result-card {
  background: #fff;
  border: 1px solid #d8dee8;
  padding: 0.4rem;
}

.inline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.45rem;
}

.inline-tags button {
  background: #eef5ff;
  border: 0;
  color: #0f4c81;
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0.2rem 0.45rem;
}

.error-text {
  color: #b3261e;
}

@media (max-width: 760px) {
  .search-input-row {
    grid-template-columns: 1fr;
  }
}
</style>
