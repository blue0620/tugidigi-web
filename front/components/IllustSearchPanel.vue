<script setup lang="ts">
import type { Illustration, SearchResult } from '~/types/domain';
import { illustrationCropUrl } from '~/utils/illustration-image';

type SearchTab = 'sample' | 'metadata' | 'local' | 'url' | 'words';
type CropRect = { x: number; y: number; width: number; height: number };

const props = defineProps<{
  qillust?: Illustration | null;
  initialKeyword?: string;
  initialUrl?: string;
  initialKeyword2vec?: string;
  initialTab?: SearchTab;
}>();

const route = useRoute();
const router = useRouter();
const runtimeConfig = useRuntimeConfig();
const { normalizeQuery } = useQueryParams();
const { $notify, $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);
const {
  getDefaultIllustrations,
  getIllustration,
  getRandomIllustrationsWithFacet,
  searchIllustrationsByFeature,
} = useSearchApi();

const activeTab = ref<SearchTab>(props.initialTab || 'sample');
const keyword = ref(props.initialKeyword || '');
const targetUrl = ref(props.initialUrl || '');
const keyword2vec = ref(props.initialKeyword2vec || '');

const sampleIllustrations = ref<Illustration[]>([]);
const selectedSample = ref<Illustration | null>(props.qillust || null);

const localImage = ref('');
const localResults = ref<SearchResult<Illustration> | null>(null);
const localLoading = ref(false);
const localError = ref('');
const cropModalActive = ref(false);

const urlResults = ref<SearchResult<Illustration> | null>(null);
const urlLoading = ref(false);
const urlError = ref('');

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

const tabItems = computed<Array<{ key: SearchTab; label: string; icon: string }>>(() => [
  { key: 'sample', label: t('サンプル画像から', 'From sample images'), icon: 'mdi-image' },
  { key: 'metadata', label: t('資料のタイトルや目次から', 'From titles or table of contents'), icon: 'mdi-image-search' },
  { key: 'local', label: t('手元の画像から', 'From your image'), icon: 'mdi-image-plus' },
  { key: 'url', label: t('URLから', 'From URL'), icon: 'mdi-link-variant' },
  { key: 'words', label: t('単語や文章から', 'From words or sentences'), icon: 'mdi-text-search' },
]);

const loadDefaultSamples = async () => {
  try {
    sampleIllustrations.value = await getDefaultIllustrations();
  } catch (error) {
    console.error(error);
    sampleIllustrations.value = [];
  }
};

onMounted(loadDefaultSamples);

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
  const keywords = presetKeywords || keyword.value.split(/[\s\u3000]+/).filter(Boolean);
  if (!keywords.length) {
    $notify(t('検索キーワードを入力してください。', 'Please enter search keywords.'), 'error');
    return;
  }
  await openResultPage({ keyword: keywords });
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
  reader.onload = (loadEvent) => {
    localImage.value = String(loadEvent.target?.result || '');
    localResults.value = null;
    localError.value = '';
  };
  reader.readAsDataURL(file);
};

const createSearchImage = async (source: string, rect?: CropRect) => {
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

const analyzeLocalImage = async (rect?: CropRect) => {
  if (!localImage.value) return;
  localLoading.value = true;
  localError.value = '';
  localResults.value = null;
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
      localError.value = t('画像を解析できませんでした。', 'Failed to analyze the image.');
      return;
    }
    localResults.value = await searchIllustrationsByFeature(features);
  } catch (error) {
    console.error(error);
    localError.value = t('画像検索に失敗しました。', 'Image search failed.');
  } finally {
    localLoading.value = false;
  }
};

const clearLocalImage = () => {
  localImage.value = '';
  localResults.value = null;
  localError.value = '';
  cropModalActive.value = false;
  localLoading.value = false;
};

const openCropModal = () => {
  if (!localImage.value) return;
  cropModalActive.value = true;
};

const cropSearch = async (rect: CropRect | null) => {
  cropModalActive.value = false;
  if (rect) {
    await analyzeLocalImage(rect);
  }
};

const searchByUrl = async () => {
  if (!targetUrl.value) {
    $notify(t('画像の URL を入力してください。', 'Please enter an image URL.'), 'error');
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
      urlError.value = t('エラーが発生しました。URL の形式を確認してください。', 'An error occurred. Please check the URL format.');
      return;
    }
    urlResults.value = await searchIllustrationsByFeature(features);
  } catch (error) {
    console.error(error);
    urlError.value = t('エラーが発生しました。時間をおいて再試行してください。', 'An error occurred. Please try again later.');
  } finally {
    urlLoading.value = false;
  }
};

const searchByWords = async () => {
  if (!keyword2vec.value.trim()) {
    $notify(t('単語や文章を入力してください。', 'Please enter words or a sentence.'), 'error');
    return;
  }
  await openResultPage({ keyword2vec: keyword2vec.value.trim() });
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
    <h1 class="page-title">{{ t('画像検索', 'Illustration search') }}</h1>

    <div class="tab-row">
      <button
        v-for="item in tabItems"
        :key="item.key"
        type="button"
        :class="{ 'is-active': activeTab === item.key }"
        @click="activeTab = item.key"
      >
        <span class="mdi" :class="item.icon" aria-hidden="true"></span>
        <span>{{ item.label }}</span>
      </button>
    </div>

    <section v-if="activeTab === 'sample'" class="panel-block">
      <p class="guide" :class="{ 'is-hidden': selectedSample }">
        {{ t('サンプルの中から画像を選んでください。選んだ画像に似た画像や、それを含む資料を検索できます。', 'Choose an image from the samples. You can search for similar images and materials containing them.') }}
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
        <button class="button" type="button" @click="reloadSample('picture')">{{ t('写真を探す', 'Find photos') }}</button>
        <button class="button" type="button" @click="reloadSample('graphic')">{{ t('絵を探す', 'Find illustrations') }}</button>
      </div>
    </section>

    <section v-else-if="activeTab === 'metadata'" class="panel-block">
      <p class="guide">{{ t('検索したいキーワードを入力してください。表示された資料の画像から検索できます。', 'Enter keywords to search. You can then search from the images shown in the materials.') }}</p>
      <form class="search-form" @submit.prevent="searchByKeyword()">
        <div class="search-input-row">
          <input v-model="keyword" class="input" type="text" autocomplete="off">
          <button class="button" type="submit">{{ t('検索', 'Search') }}</button>
        </div>
        <div class="preset-row">
          <span>{{ t('キーワード例', 'Keyword examples') }}</span>
          <button type="button" @click="searchByKeyword(['楽面'])">楽面</button>
          <button type="button" @click="searchByKeyword(['友禅'])">友禅</button>
          <button type="button" @click="searchByKeyword(['造船'])">造船</button>
          <button type="button" @click="searchByKeyword(['下絵'])">下絵</button>
          <button type="button" @click="searchByKeyword(['十姉妹'])">十姉妹</button>
        </div>
      </form>
    </section>

    <section v-else-if="activeTab === 'local'" class="panel-block">
      <div v-if="!localImage" class="upload-area">
        <label class="upload-drop">
          <input type="file" accept="image/*" @change="selectFile">
          <span>{{ t('ここに画像をドロップするか、クリックして選択してください', 'Drop an image here or click to select one.') }}</span>
        </label>
      </div>

      <div v-else class="local-preview-block">
        <img :src="localImage" alt="" class="local-preview-image">
        <div class="local-actions">
          <button class="button" type="button" @click="analyzeLocalImage">{{ t('解析して検索', 'Analyze and search') }}</button>
          <button class="button is-secondary" type="button" @click="clearLocalImage">
            <span class="mdi mdi-delete" aria-hidden="true"></span>
          </button>
        </div>
        <div class="local-actions">
          <button class="button" type="button" @click="openCropModal">{{ t('画像の一部から検索する', 'Search from part of the image') }}</button>
        </div>
      </div>

      <div v-if="localLoading" class="muted">{{ t('検索中です。しばらくお待ちください。', 'Searching. Please wait a moment.') }}</div>
      <div v-else-if="localError" class="error-text">{{ localError }}</div>

      <div v-if="localResults?.list?.length" class="inline-results">
        <IllustrationResultCard
          v-for="item in localResults.list"
          :key="item.id"
          :illustration="item"
          @search="openResultPage({ image: $event.id })"
          @search-tag="searchWithTag($event.illustration, $event.tag)"
        />
      </div>

      <RectEditorModal v-if="cropModalActive" :image-src="localImage" @close="cropSearch" />
    </section>

    <section v-else-if="activeTab === 'url'" class="panel-block">
      <p class="guide">{{ t('検索したい画像の URL を入力してください。', 'Enter the URL of the image you want to search.') }}</p>
      <form class="search-form" @submit.prevent="searchByUrl">
        <div class="search-input-row">
          <input v-model="targetUrl" class="input" type="url" autocomplete="off">
          <button class="button" type="submit">{{ t('検索', 'Search') }}</button>
        </div>
      </form>
      <div v-if="urlLoading" class="muted">{{ t('検索中です。しばらくお待ちください。', 'Searching. Please wait a moment.') }}</div>
      <div v-else-if="urlError" class="error-text">{{ urlError }}</div>
      <div v-if="urlResults?.list?.length" class="inline-results">
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
      <p class="guide">{{ t('単語や文章から、イメージに近い画像を検索します。', 'Search for images similar to a word or sentence.') }}</p>
      <form class="search-form" @submit.prevent="searchByWords">
        <div class="search-input-row">
          <input v-model="keyword2vec" class="input" type="text" autocomplete="off">
          <button class="button" type="submit">{{ t('検索', 'Search') }}</button>
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

.sample-grid,
.inline-results {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(5, 320px);
  justify-content: center;
  margin-top: 1rem;
}

.sample-card {
  background: #fff;
  border: 1px solid #d8dee8;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  padding: 0.4rem;
}

.sample-card img,
.local-preview-image {
  display: block;
  height: 180px;
  max-width: 100%;
  object-fit: contain;
  width: 100%;
}

.reload-row,
.query-illustration {
  display: flex;
  justify-content: center;
}

.reload-row,
.local-actions,
.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.9rem;
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
  display: flex;
  justify-content: center;
}

.upload-drop {
  align-items: center;
  border: 1px dashed #b9c6d8;
  cursor: pointer;
  display: flex;
  justify-content: center;
  max-width: 50%;
  min-height: 180px;
  padding: 1rem;
  width: 100%;
}

.upload-drop input {
  display: none;
}

.local-preview-block {
  margin-left: auto;
  margin-right: auto;
  max-width: 50%;
}

.local-preview-image {
  height: 300px;
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
  .sample-grid,
  .inline-results {
    grid-template-columns: repeat(4, 320px);
  }
}

@media (max-width: 1360px) {
  .sample-grid,
  .inline-results {
    grid-template-columns: repeat(3, 320px);
  }
}

@media (max-width: 980px) {
  .search-form {
    width: 100%;
  }

  .upload-drop,
  .local-preview-block {
    max-width: 100%;
  }

  .search-input-row {
    grid-template-columns: 1fr;
  }

  .sample-grid,
  .inline-results {
    grid-template-columns: repeat(2, minmax(0, 320px));
  }
}

@media (max-width: 700px) {
  .sample-grid,
  .inline-results {
    grid-template-columns: minmax(0, 320px);
  }
}
</style>
