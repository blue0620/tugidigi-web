<script setup lang="ts">
import 'leaflet/dist/leaflet.css';
import type { Book, Page } from '~/types/domain';

interface IiifService {
  '@id'?: string;
  id?: string;
}

interface IiifImageResource {
  '@id'?: string;
  id?: string;
  service?: IiifService | IiifService[];
}

interface IiifAnnotation {
  resource?: IiifImageResource;
  body?: IiifImageResource;
}

interface IiifCanvas {
  '@id'?: string;
  id?: string;
  images?: IiifAnnotation[];
  items?: Array<{
    items?: Array<{
      body?: IiifImageResource;
    }>;
  }>;
}

interface IiifManifest {
  sequences?: Array<{
    canvases?: IiifCanvas[];
  }>;
  items?: IiifCanvas[];
}

interface CoordjsonContent {
  id: number;
  contenttext: string;
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

type LeafletType = typeof import('leaflet');

const props = defineProps<{
  book: Book | null;
  manifestUrl: string;
  page: number;
  keywords?: string[];
}>();

const emit = defineEmits<{
  'update:page': [page: number];
}>();

const route = useRoute();
const runtimeConfig = useRuntimeConfig();

const manifest = ref<IiifManifest | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const currentPage = ref(1);
const inputPageModel = ref('1');
const leftOpen = ref(false);
const directionState = ref<'none' | 'estimated' | 'manual'>('none');

const leafletHost = ref<HTMLElement | null>(null);

let inputTimer: ReturnType<typeof setTimeout> | null = null;
let LRef: LeafletType | null = null;
let map: any = null;
let iiifLayer: any = null;
let markerLayer: any = null;
let initialZoom: number | null = null;

const canvases = computed<IiifCanvas[]>(() => {
  if (manifest.value?.sequences?.[0]?.canvases?.length) {
    return manifest.value.sequences[0].canvases || [];
  }
  return manifest.value?.items || [];
});

const totalPage = computed(() => canvases.value.length);

const markerIconUrl = computed(() => `${runtimeConfig.app.baseURL}assets/js/marker-icon.png`);
const markerIconYokoUrl = computed(() => `${runtimeConfig.app.baseURL}assets/js/marker-icon-yoko.png`);

const clampPage = (value: number) => {
  if (!Number.isFinite(value) || value < 1) return 1;
  if (!totalPage.value) return Math.max(1, Math.trunc(value));
  return Math.min(totalPage.value, Math.max(1, Math.trunc(value)));
};

const resolveDirection = () => {
  if (typeof props.book?.leftopen === 'boolean') {
    leftOpen.value = props.book.leftopen;
    directionState.value = 'estimated';
    return;
  }
  leftOpen.value = false;
  directionState.value = 'none';
};

const extractImageResource = (canvas: IiifCanvas | undefined) => {
  if (!canvas) return null;
  const legacyResource = canvas.images?.[0]?.resource;
  if (legacyResource) return legacyResource;
  return canvas.items?.[0]?.items?.[0]?.body || null;
};

const resolveServiceId = (canvas: IiifCanvas | undefined) => {
  const resource = extractImageResource(canvas);
  if (!resource) return '';
  const service = Array.isArray(resource.service) ? resource.service[0] : resource.service;
  return service?.['@id'] || service?.id || '';
};

const currentInfoUrl = computed(() => {
  const serviceId = resolveServiceId(canvases.value[currentPage.value - 1]);
  return serviceId ? `${serviceId}/info.json` : '';
});

const applyPage = (value: number) => {
  const nextPage = clampPage(value);
  currentPage.value = nextPage;
  inputPageModel.value = String(nextPage);
  if (nextPage !== props.page) {
    emit('update:page', nextPage);
  }
};

const commitInputPage = () => {
  const parsed = Number(inputPageModel.value);
  applyPage(Number.isFinite(parsed) ? parsed : 1);
};

const queueInputCommit = () => {
  if (inputTimer) window.clearTimeout(inputTimer);
  inputTimer = window.setTimeout(commitInputPage, 1000);
};

const next = () => {
  if (currentPage.value < totalPage.value) {
    applyPage(currentPage.value + 1);
  }
};

const previous = () => {
  if (currentPage.value > 1) {
    applyPage(currentPage.value - 1);
  }
};

const changeDirection = () => {
  leftOpen.value = !leftOpen.value;
  directionState.value = 'manual';
};

const handleLeftButton = () => {
  if (leftOpen.value) {
    previous();
    return;
  }
  next();
};

const handleRightButton = () => {
  if (leftOpen.value) {
    next();
    return;
  }
  previous();
};

const directionLabel = computed(() => {
  if (directionState.value === 'none') return 'ページ方向情報なし';
  if (directionState.value === 'estimated') return 'ページ方向(自動推定)';
  return 'ページ方向';
});

const directionValue = computed(() => (leftOpen.value ? '右開き' : '左開き'));

const pageId = computed(() => {
  if (!props.book?.id) return '';
  return `${props.book.id}_${currentPage.value}`;
});

const highlightKeyword = (text: string, keyword: string) => {
  return text.replace(keyword, `<span style='background:yellow'>${keyword}</span>`);
};

const clearLayers = () => {
  if (!map) return;
  map.eachLayer((layer: any) => {
    map.removeLayer(layer);
  });
};

const fitBounds = () => {
  if (iiifLayer && typeof iiifLayer._fitBounds === 'function') {
    iiifLayer._fitBounds();
  }
};

const ensureLeaflet = async () => {
  if (LRef) return LRef;
  const leafletModule = await import('leaflet');
  LRef = leafletModule;
  (globalThis as any).L = leafletModule;
  await import('~/src/ts/components/iiif-viewer/leaflet-iiif.js');
  return leafletModule;
};

const initMap = async () => {
  if (!import.meta.client || map || !leafletHost.value) return;

  const L = await ensureLeaflet();
  map = L.map(leafletHost.value, {
    attributionControl: false,
    zoomControl: false,
    wheelDebounceTime: 200,
    wheelPxPerZoomLevel: 60,
    zoomSnap: 0.1,
    center: [0, 0] as any,
    crs: L.CRS.Simple,
    zoom: 2,
  });
};

const getInitialZoom = async (infoUrl: string) => {
  if (!infoUrl || !map) return;

  const infojson = await fetch(infoUrl).then((response) => response.json());
  const tolerance = 1.0;
  const imageSizes = infojson.sizes || [];
  const mapSize = infojson.tiles?.[0];
  let result = 2;

  if (mapSize) {
    for (let i = imageSizes.length - 1; i >= 0; i -= 1) {
      const imageSize = imageSizes[i];
      if (imageSize.width * tolerance < mapSize.width && imageSize.height * tolerance < mapSize.height) {
        result = imageSizes.length - i;
        break;
      }
    }
  }

  initialZoom = result;
};

const pointToLatLng = (x: number, y: number) => {
  if (!map || initialZoom == null) return null;
  return map.unproject([x, y], initialZoom);
};

const addKeywordMarkers = async (currentPageId: string) => {
  if (!map || !LRef) return;

  if (markerLayer) {
    map.removeLayer(markerLayer);
  }

  markerLayer = new LRef.LayerGroup();

  if (!props.keywords?.length) {
    markerLayer.addTo(map);
    return;
  }

  const [pageData, analyzedPage] = await Promise.all([
    useApiFetch<Page>(`/page/${currentPageId}`),
    useApiFetch<Page>(`/analyze/page/${currentPageId}`),
  ]);

  if (!pageData.coordjson || !analyzedPage.coordjson) {
    markerLayer.addTo(map);
    return;
  }

  const coordjson = JSON.parse(pageData.coordjson) as CoordjsonContent[];
  const analyzedCoordjson = JSON.parse(analyzedPage.coordjson) as CoordjsonContent[];

  props.keywords.forEach((keyword) => {
    coordjson.forEach((item, index) => {
      const contenttext = item.contenttext || '';
      const analyzedText = analyzedCoordjson[index]?.contenttext || '';
      const pos = contenttext.indexOf(keyword);
      const posAnalyzed = analyzedText.indexOf(keyword);
      const targetPos = pos !== -1 ? pos : posAnalyzed;

      if (targetPos === -1) return;

      const width = item.xmax - item.xmin;
      const height = item.ymax - item.ymin;
      let markerX: number;
      let markerY: number;
      let iconSize: [number, number];
      let iconAnchor: [number, number];
      let iconUrl: string;

      if (width > height) {
        markerX = (item.xmax * targetPos + item.xmin * (contenttext.length - targetPos)) / Math.max(contenttext.length, 1);
        markerY = (item.ymin + item.ymax) / 2;
        iconSize = [16, 28];
        iconAnchor = [8, 28];
        iconUrl = markerIconUrl.value;
      } else {
        markerX = (item.xmin + item.xmax) / 2;
        markerY = (item.ymax * targetPos + item.ymin * (contenttext.length - targetPos)) / Math.max(contenttext.length, 1);
        iconSize = [28, 16];
        iconAnchor = [0, 8];
        iconUrl = markerIconYokoUrl.value;
      }

      const latLng = pointToLatLng(markerX, markerY);
      if (!latLng) return;

      const icon = LRef!.icon({
        iconUrl,
        iconRetinaUrl: iconUrl,
        shadowUrl: '',
        shadowSize: [0, 0],
        iconSize,
        iconAnchor,
      });

      const marker = LRef!.marker(latLng, { icon });
      marker.bindTooltip(highlightKeyword(contenttext, keyword));
      marker.addTo(markerLayer);
    });
  });

  markerLayer.addTo(map);
};

const setInfo = async (infoUrl: string) => {
  if (!map || !infoUrl || !LRef) return;
  clearLayers();
  map.setMaxZoom(Number.POSITIVE_INFINITY);
  map.setMinZoom(0);
  iiifLayer = (LRef as any).tileLayer.iiif(infoUrl, {});
  map.addLayer(iiifLayer);
  if (iiifLayer?._infoPromise) {
    await iiifLayer._infoPromise;
  }
};

const setCurrentIiifPage = async (pageNumber: number) => {
  if (!manifest.value || pageNumber <= 0 || !map) return;
  const infoUrl = currentInfoUrl.value;
  if (!infoUrl) return;

  await setInfo(infoUrl);
  await getInitialZoom(infoUrl);
  fitBounds();
  resolveDirection();
  await addKeywordMarkers(`${props.book?.id}_${pageNumber}`);
};

const loadManifest = async () => {
  if (!import.meta.client || !props.manifestUrl) return;

  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await fetch(props.manifestUrl, { credentials: 'omit' });
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status}`);
    }
    manifest.value = (await response.json()) as IiifManifest;
    resolveDirection();
    applyPage(props.page || 1);
  } catch (error) {
    manifest.value = null;
    errorMessage.value = 'IIIF manifest を取得できませんでした。';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.page,
  (value) => {
    applyPage(value || 1);
  },
);

watch(
  () => props.book?.leftopen,
  () => {
    resolveDirection();
  },
);

watch(
  () => props.manifestUrl,
  () => {
    loadManifest();
  },
);

watch(
  () => [currentPage.value, props.keywords?.join('|') || '', route.fullPath].join(':'),
  async () => {
    if (map && manifest.value) {
      await setCurrentIiifPage(currentPage.value);
    }
  },
);

onMounted(async () => {
  await initMap();
  await loadManifest();
});

onBeforeUnmount(() => {
  if (inputTimer) window.clearTimeout(inputTimer);
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <section class="iiif-viewer">
    <div class="iiif-viewer-group">
      <button class="button is-small nav-button leftbutton" type="button" :disabled="!totalPage" @click="handleLeftButton">
        &lsaquo;&lsaquo;
      </button>

      <div class="viewer-contrast">
        <div ref="leafletHost" class="viewer"></div>
        <div v-if="loading" class="viewer-overlay-message">IIIF manifest を読み込んでいます...</div>
        <div v-else-if="errorMessage" class="viewer-overlay-message">{{ errorMessage }}</div>
      </div>

      <button class="button is-small nav-button rightbutton" type="button" :disabled="!totalPage" @click="handleRightButton">
        &rsaquo;&rsaquo;
      </button>

      <div class="iiif-control-zoom">
        <button class="button is-large" type="button" @click="map?.zoomOut()">-</button>
        <button class="button is-large" type="button" @click="fitBounds()">Fit</button>
        <button class="button is-large" type="button" @click="map?.zoomIn()">+</button>
      </div>
    </div>

    <div class="iiif-control-group">
      <div class="iiif-control-page" v-if="totalPage">
        <button class="button is-small" type="button" :disabled="currentPage <= 1" @click="previous">前へ</button>
        <input v-model="inputPageModel" class="input is-small iiif-inputpage" type="text" @blur="commitInputPage" @input="queueInputCommit" />
        <span class="iiif-total">/{{ totalPage }}</span>
        <button class="button is-small" type="button" :disabled="currentPage >= totalPage" @click="next">次へ</button>
      </div>

      <div class="direction-group">
        <span>{{ directionLabel }}</span>
        <span>{{ directionValue }}</span>
        <button class="button is-small" type="button" @click="changeDirection">入れ替える</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.iiif-viewer {
  background: #f5f5f5;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
}

.iiif-viewer-group {
  position: relative;
}

.leftbutton,
.rightbutton {
  height: 20%;
  opacity: 0.5;
  position: absolute;
  top: 40%;
  z-index: 800;
}

.leftbutton {
  left: 0;
}

.rightbutton {
  right: 0;
}

.iiif-control-zoom {
  display: flex;
  gap: 0.5rem;
  opacity: 0.8;
  position: absolute;
  right: 1rem;
  top: 0;
  z-index: 800;
}

.viewer-contrast {
  height: 100%;
  position: relative;
}

.viewer {
  height: calc(100vh - 120px);
  margin: 0;
}

.viewer-overlay-message {
  align-items: center;
  background: rgba(245, 245, 245, 0.94);
  color: #334155;
  display: flex;
  inset: 0;
  justify-content: center;
  pointer-events: none;
  position: absolute;
  z-index: 700;
}

.iiif-control-group {
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 0.5rem 0 0.75rem;
  width: 100%;
}

.iiif-control-page {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.iiif-inputpage {
  max-width: 3rem;
  min-width: 1.5rem;
  text-align: right;
}

.iiif-total {
  color: #334155;
}

.direction-group {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

:deep(.leaflet-container) {
  background-color: #1f2937;
}

:deep(.leaflet-tooltip) {
  background: rgba(34, 34, 34, 0.9);
  border: none;
  color: #fff;
}

@media (max-width: 980px) {
  .viewer {
    height: 70vh;
  }

  .iiif-control-group {
    flex-wrap: wrap;
  }
}
</style>
