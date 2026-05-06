<script setup lang="ts">
import type { Illustration, SearchResult } from '~/types/domain';
import { illustrationCropUrl } from '~/utils/illustration-image';

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
const urlResults = ref<SearchResult<Illustration> | null>(null);
const urlLoading = ref(false);
const urlError = ref('');
const selectedSample = ref<Illustration | null>(props.qillust || null);
const cropModalActive = ref(false);

watch(
  () => [props.initialKeyword, props.initialUrl, props.initialKeyword2vec, props.initialTab, props.qillust],
  () => {
    keyword.value = props.initialKeyword || '';
    targetUrl.value = props.initialUrl || '';
    keyword2vec.value = props.initialKeyword2vec || '';
    activeTab.value = props.initialTab || 'sample';
    selectedSample.value = props.qillust || null;
    urlResults.value = null;
    urlError.value = '';
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

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab === 'sample' && !selectedSample.value && !sampleIllustrations.value.length) {
      await loadDefaultIllustrations();
    }
  },
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
  const keywords = presetKeywords || keyword.value.split(/[\s\u3000]+/).filter(Boolean);
  if (!keywords.length) {
    $notify('検索キーワードを入力してください。', 'error');
    return;
  }
  await openResultPage({ keyword: keywords });
};

const searchByUrl = async () => {
  if (!targetUrl.value) {
    $notify('画像の URL を入力してください。', 'error');
    return;
  }
  urlLoading.value = true;
  urlError.value = '';
  urlResults.value = null;
  try {
    const response = await fetch(String(runtimeConfig.public.imageFeaturesEndpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ img_url: targetUrl.value }),
    });
    const payload = await response.json();
    const features = payload?.body;
    if (!features) {
      urlError.value = 'エラーが発生しました。URL の形式を確認してください。';
      return;
    }
    urlResults.value = await searchIllustrationsByFeature(features);
  } catch (error) {
    console.error(error);
    urlError.value = 'エラーが発生しました。時間をおいて再試行してください。';
  } finally {
    urlLoading.value = false;
  }
};

const searchByWords = async () => {
  if (!keyword2vec.value.trim()) {
    $notify('単語や文章を入力してください。', 'error');
    return;
  }
  await openResultPage({ keyword2vec: keyword2vec.value.trim() });
};

const reloadSample = async (facet: 'picture' | 'graphic') => {
  try {
    selectedSample.value = null;
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

const createSearchImage = async (source: string, rect?: { x: number; y: number; width: number; height: number }) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = source;
  });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return source;

  canvas.width = 224;
  canvas.height = 224;

  if (rect) {
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, 224, 224);
  } else {
    context.drawImage(image, 0, 0, image.width, image.height, 0, 0, 224, 224);
  }

  return canvas.toDataURL('image/jpeg');
};

const analyzeLocalImage = async (rect?: { x: number; y: number; width: number; height: number }) => {
  if (!localImage.value) return;
  localLoading.value = true;
  localError.value = '';
  try {
    const searchImage = await createSearchImage(localImage.value, rect);
    const response = await fetch(String(runtimeConfig.public.imageFeaturesEndpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ img_b64: searchImage }),
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
  cropModalActive.value = false;
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

const openCropModal = () => {
  if (!localImage.value) return;
  cropModalActive.value = true;
};

const cropSearch = async (rect: { x: number; y: number; width: number; height: number } | null) => {
  cropModalActive.value = false;
  if (rect) {
    await analyzeLocalImage(rect);
  }
};

watch(
  () => [activeTab.value, targetUrl.value, props.initialTab],
  async () => {
    if (activeTab.value === 'url' && targetUrl.value && props.initialTab === 'url' && !urlResults.value && !urlLoading.value) {
      await searchByUrl();
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="illust-search-panel">
    <h1 class="page-title">画像検索</h1>

    <div class="tab-row">
      <button type="button" :class="{ 'is-active': activeTab === 'sample' }" @click="activeTab = 'sample'">
        <span class="mdi mdi-image" aria-hidden="true"></span>
        <span>サンプル画像から</span>
      </button>
      <button type="button" :class="{ 'is-active': activeTab === 'metadata' }" @click="activeTab = 'metadata'">
        <span class="mdi mdi-image-search" aria-hidden="true"></span>
        <span>資料のタイトルや目次から</span>
      </button>
      <button type="button" :class="{ 'is-active': activeTab === 'local' }" @click="activeTab = 'local'">
        <span class="mdi mdi-image-plus" aria-hidden="true"></span>
        <span>手元の画像から</span>
      </button>
      <button type="button" :class="{ 'is-active': activeTab === 'url' }" @click="activeTab = 'url'">
        <span class="mdi mdi-link-variant" aria-hidden="true"></span>
        <span>URLから</span>
      </button>
      <button type="button" :class="{ 'is-active': activeTab === 'words' }" @click="activeTab = 'words'">
        <span class="mdi mdi-text-search" aria-hidden="true"></span>
        <span>単語や文章から</span>
      </button>
    </div>

    <section v-if="activeTab === 'sample'" class="panel-block">
      <p class="guide" :class="{ 'is-hidden': selectedSample }">
        サンプルの中から画像を選んでください。さらに似た画像や、その画像を含む資料を検索できます。
      </p>
      <div v-if="selectedSample" class="query-illustration">
        <IllustrationResultCard :illustration="selectedSample" compact />
      </div>
      <div v-else class="sample-grid">
        <button v-for="item in sampleIllustrations" :key="item.id" class="sample-card" type="button" @click="searchBySample(item)">
          <img :src="illustrationCropUrl(item, 180)" alt="" loading="lazy">
        </button>
      </div>
      <div class="reload-row">
        <button class="button" type="button" @click="reloadSample('picture')">写真を探す</button>
        <button class="button" type="button" @click="reloadSample('graphic')">絵を探す</button>
      </div>
    </section>

    <section v-else-if="activeTab === 'metadata'" class="panel-block">
      <p class="guide">検索したいキーワードを入力してください。表示された資料の画像から検索できます。</p>
      <form class="search-form" @submit.prevent="searchByKeyword()">
        <div class="search-input-row">
          <input v-model="keyword" class="input" type="text" autocomplete="off">
          <button class="button" type="submit">検索</button>
        </div>
        <div class="preset-row">
          <span>キーワード例</span>
          <button type="button" @click="searchByKeyword(['楽面'])">楽面</button>
          <button type="button" @click="searchByKeyword(['友禅'])">友禅</button>
          <button type="button" @click="searchByKeyword(['造船'])">造船</button>
          <button type="button" @click="searchByKeyword(['下絵'])">下絵</button>
          <button type="button" @click="searchByKeyword(['十姉妹'])">十姉妹</button>
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
          <button class="button" type="button" @click="openCropModal">画像の一部から検索する</button>
          <button class="button is-secondary" type="button" @click="clearLocalImage">クリア</button>
        </div>
      </div>
      <p v-if="localLoading" class="muted">画像を解析しています...</p>
      <p v-else-if="localError" class="error-text">{{ localError }}</p>
      <div v-else-if="localResults?.list?.length" class="sample-grid inline-results">
        <article v-for="item in localResults.list" :key="item.id" class="inline-result-card">
          <button class="image-only" type="button" @click="openResultPage({ image: item.id })">
            <img :src="illustrationCropUrl(item, 180)" alt="">
          </button>
          <div class="inline-tags">
            <button v-for="tag in topTags(item)" :key="tag.tagname" type="button" @click="searchWithTag(item, tag.tagname)">{{ tag.tagname }}</button>
          </div>
        </article>
      </div>
      <RectEditorModal v-if="cropModalActive" :image-src="localImage" @close="cropSearch" />
    </section>

    <section v-else-if="activeTab === 'url'" class="panel-block">
      <p class="guide">画像の URL を入力して検索します。</p>
      <form class="search-form" @submit.prevent="searchByUrl">
        <div class="search-input-row">
          <input v-model="targetUrl" class="input" type="url" autocomplete="off">
          <button class="button" type="submit">検索</button>
        </div>
      </form>
      <p v-if="urlLoading" class="muted">画像を解析しています...</p>
      <p v-else-if="urlError" class="error-text">{{ urlError }}</p>
      <div v-else-if="urlResults?.list?.length" class="sample-grid inline-results">
        <IllustrationResultCard
          v-for="item in urlResults.list"
          :key="item.id"
          :illustration="item"
          @search="openResultPage({ image: $event.id })"
          @search-tag="searchWithTag($event.illustration, $event.tag)"
        />
      </div>
    </section>

    <section v-else class="panel-block">
      <p class="guide">単語や文章から、イメージに近い画像を検索します。</p>
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
  text-align: center;
}

.tab-row {
  border-bottom: 1px solid #dbe3ed;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tab-row button {
  align-items: center;
  background: transparent;
  border: 0;
  border-bottom: 3px solid transparent;
  color: #53657a;
  cursor: pointer;
  display: inline-flex;
  gap: 0.35rem;
  padding: 0.75rem 0.9rem;
}

.tab-row button .mdi {
  font-size: 1rem;
  line-height: 1;
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
  font-size: 0.9rem;
  line-height: 1.7;
  margin: 0 0 0.9rem;
  text-align: center;
}

.guide.is-hidden {
  visibility: hidden;
}

.sample-grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(5, 320px);
  justify-content: center;
}

.sample-card,
.image-only {
  background: #fff;
  border: 1px solid #d8dee8;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  padding: 0.4rem;
}

.sample-card img,
.image-only img,
.local-preview img {
  display: block;
  height: 180px;
  max-width: 100%;
  object-fit: contain;
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

.reload-row,
.query-illustration {
  justify-content: center;
}

.query-illustration {
  display: flex;
}

.search-form {
  margin-left: auto;
  margin-right: auto;
  width: 50%;
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
  margin-left: auto;
  margin-right: auto;
  max-width: 50%;
  border: 1px dashed #b9c6d8;
  padding: 1rem;
}

.local-preview {
  display: grid;
  gap: 0.8rem;
  margin-top: 1rem;
  margin-left: auto;
  margin-right: auto;
  max-width: 50%;
}

.inline-results {
  margin-top: 1rem;
  justify-items: center;
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
  text-align: center;
}

.muted {
  color: #4b5563;
  text-align: center;
}

@media (max-width: 1700px) {
  .sample-grid {
    grid-template-columns: repeat(4, 320px);
  }
}

@media (max-width: 1360px) {
  .sample-grid {
    grid-template-columns: repeat(3, 320px);
  }
}

@media (max-width: 980px) {
  .search-form {
    width: 100%;
  }

  .upload-area,
  .local-preview {
    max-width: 100%;
  }

  .search-input-row {
    grid-template-columns: 1fr;
  }

  .sample-grid {
    grid-template-columns: repeat(2, minmax(0, 320px));
  }
}

@media (max-width: 700px) {
  .sample-grid {
    grid-template-columns: minmax(0, 320px);
  }
}
</style>
