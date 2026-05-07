<script setup lang="ts">
import 'leaflet/dist/leaflet.css';
import type { Book, Page } from '~/types/domain';
import { checkTagPermission, setTagPermission } from '~/utils/mypage-storage';
import {
  deleteBookIdByTagName,
  pushBookIdByTagName,
  putTagObject,
  retrieveAllObjectByBookId,
  retrieveAllTagNames,
} from '~/utils/mypage-indexeddb';

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

interface SelectedCoordinates {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
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
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

const manifest = ref<IiifManifest | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const currentPage = ref(1);
const inputPageModel = ref('1');
const div = ref(false);
const full = ref(false);
const bwflag = ref(false);
const th = ref(161);
const showThParam = ref(false);
const leftOpen = ref(false);
const directionState = ref<'none' | 'estimated' | 'manual'>('none');

const textDisplay = ref(false);
const copyMode = ref(false);
const tableMode = ref(false);
const isCopyModalActive = ref(false);
const isDownloadModalActive = ref(false);
const isTaggingModalActive = ref(false);
const selectAreaFlag = ref(false);
const mouseupedInOutside = ref(false);
const isAreaSelecting = ref(false);
const shouldInsertSpace = ref(false);
const shouldDivideByCenter = ref(false);
const shouldIgnoreRuby = ref(false);
const rubySize = ref(0);
const tableHtml = ref('');
const tableFormat = ref<'HTML' | 'TSV'>('HTML');
const tableRecLoading = ref(false);
const notificationMessage = ref('');
const allTagNames = ref<string[]>([]);
const attachedTagNames = ref<string[]>([]);
const tagAddInput = ref('');

const selectedCoordinates = ref<SelectedCoordinates>({
  minX: 0,
  minY: 0,
  maxX: 0,
  maxY: 0,
});
const centerAxisX = ref(0);

const leafletHost = ref<HTMLElement | null>(null);

let inputTimer: ReturnType<typeof setTimeout> | null = null;
let notificationTimer: ReturnType<typeof setTimeout> | null = null;
let LRef: LeafletType | null = null;
let map: any = null;
let iiifLayer: any = null;
let markerLayer: any = null;
let overlay: any = null;
let bounds: any = null;
let initialZoom: number | null = null;
let imageWidth = 0;
let imageHeight = 0;
let onKeydown: ((event: KeyboardEvent) => void) | null = null;
let textAreaRectangles: any[] = [];
let selectedAreaRectangle: any = null;
let mousedownLatLng: any = null;
let mouseupLatLng: any = null;
let coordjsonCache: { pageId: string; data: CoordjsonContent[] } = { pageId: '', data: [] };

const canvases = computed<IiifCanvas[]>(() => {
  if (manifest.value?.sequences?.[0]?.canvases?.length) {
    return manifest.value.sequences[0].canvases || [];
  }
  return manifest.value?.items || [];
});

const totalPage = computed(() => {
  const size = canvases.value.length;
  return div.value ? size * 2 : size;
});

const currentDownloadPage = computed(() => (div.value ? Math.round(currentPage.value / 2) : currentPage.value));
const currentSourcePage = computed(() => (div.value ? Math.max(1, Math.round(currentPage.value / 2)) : currentPage.value));
const currentSourcePageId = computed(() => (props.book?.id ? `${props.book.id}_${currentSourcePage.value}` : ''));
const currentPageId = computed(() => (props.book?.id ? `${props.book.id}_${currentPage.value}` : ''));

const markerIconUrl = computed(() => `${runtimeConfig.app.baseURL}assets/js/marker-icon.png`);
const markerIconYokoUrl = computed(() => `${runtimeConfig.app.baseURL}assets/js/marker-icon-yoko.png`);
const colors = `0 1 0 0 0
                    0 1 0 0 0
                    0 1 0 0 0
                    0 1 0 1 0`;
const labels = {
  get directionNone() { return t('ページ方向（情報なし）', 'Page direction (no information)'); },
  get directionEstimated() { return t('ページ方向（自動推定）', 'Page direction (auto estimated)'); },
  get direction() { return t('ページ方向', 'Page direction'); },
  get openRight() { return t('右開き', 'right-opening'); },
  get openLeft() { return t('左開き', 'left-opening'); },
  get copyDone() { return t('コピーしました', 'Copied'); },
  get copyFailed() { return t('コピーできませんでした', 'Could not copy'); },
  get copyExtractFailed() { return t('文字を抽出できませんでした', 'Could not extract text'); },
  get selectTableArea() { return t('テーブル領域を選択してください。', 'Please select a table area.'); },
  get extracting() { return t('抽出中...', 'Extracting...'); },
  get tableFailed() { return t('表抽出に失敗しました。', 'Table extraction failed.'); },
  get manifestFailed() { return t('IIIF manifest を読み込めませんでした。', 'Could not load the IIIF manifest.'); },
  get loadingManifest() { return t('IIIF manifest を読み込み中...', 'Loading IIIF manifest...'); },
  get zoomOut() { return t('縮小', 'Zoom out'); },
  get fitBounds() { return t('表示領域に合わせる', 'Fit to view'); },
  get zoomIn() { return t('拡大', 'Zoom in'); },
  get fullscreen() { return t('全画面表示', 'Fullscreen'); },
  get exitFullscreen() { return t('全画面表示を閉じる', 'Exit fullscreen'); },
  get textDisplay() { return t('テキスト表示', 'Show text'); },
  get textCopy() { return t('テキストコピー', 'Copy text'); },
  get tableExtract() { return t('表抽出', 'Extract table'); },
  get tag() { return t('タグ', 'Tag'); },
  get attachTag() { return t('タグを付与する', 'Attach tag'); },
  get attach() { return t('付与', 'Attach'); },
  get tagPermission() {
    return t(
      'タグ情報はWebブラウザのIndexedDBに保存されます。共有PCでは、他の利用者にも表示されますので、その点をご理解のうえ使用してください。',
      'Tag information is stored in this browser IndexedDB. On a shared PC, it may also be visible to other users. Please use it with that understanding.',
    );
  },
  get noResults() { return t('No results found', 'No results found'); },
  get rubySize() { return t('ルビサイズ', 'Ruby size'); },
  get previous() { return t('前へ', 'Previous'); },
  get next() { return t('次へ', 'Next'); },
  get swapDirection() { return t('入れ替える', 'Swap'); },
  get divideOn() { return t('分割表示', 'Split view'); },
  get divideOff() { return t('分割解除', 'Exit split view'); },
  get currentPageImage() { return t('このページの画像', 'Image on this page'); },
  get readability() { return t('読みやすくする', 'Improve readability'); },
  get adjust() { return t('調整する', 'Adjust'); },
  get fulltextDownload() { return t('この資料の全文テキストデータ', 'Full text data for this material'); },
  get imageDownload() { return t('この資料の画像データ', 'Image data for this material'); },
  get imageDownloadTitle() { return t('画像ダウンロード', 'Image download'); },
  get imageDownloadDescription() { return t('このページの表示中画像をダウンロードします。', 'Download the currently displayed image on this page.'); },
  get download() { return t('ダウンロード', 'Download'); },
  get close() { return t('閉じる', 'Close'); },
  get copy() { return t('コピー', 'Copy'); },
  get rangeSelect() { return t('範囲選択', 'Select area'); },
  get insertSpace() { return t('文字間に空白を入れる', 'Insert spaces between characters'); },
  get ignoreRuby() { return t('ルビを無視する', 'Ignore ruby text'); },
  get spreadSort() { return t('見開きで並べ替える', 'Reorder by spread'); },
} as const;

const directionLabel = computed(() => {
  if (directionState.value === 'none') return labels.directionNone;
  if (directionState.value === 'estimated') return labels.directionEstimated;
  return labels.direction;
});
const directionValue = computed(() => (leftOpen.value ? labels.openRight : labels.openLeft));
const unattachedTags = computed(() => allTagNames.value.filter((tagName) => !attachedTagNames.value.includes(tagName)));
const filteredTagNameArray = computed(() => {
  const keyword = tagAddInput.value.trim().toLowerCase();
  if (!keyword) return allTagNames.value;
  return allTagNames.value.filter((tagName) => tagName.toLowerCase().includes(keyword));
});
const downloadLink = computed(() => {
  if (!props.book?.id) return '';
  return `${runtimeConfig.app.baseURL}api/book/download/${props.book.id}?page=${currentDownloadPage.value}`;
});

const fulltextLink = computed(() => {
  if (!props.book?.id) return '';
  return `${runtimeConfig.app.baseURL}api/book/fulltext/${props.book.id}`;
});

const komaarray = computed(() => {
  if (!props.book?.id) return [] as Array<{ page: number; url: string; filename: string }>;
  return canvases.value.map((_, index) => {
    const page = index + 1;
    return {
      page,
      url: `https://dl.ndl.go.jp/api/iiif/${props.book!.id}/R${String(page).padStart(7, '0')}/full/full/0/default.jpg`,
      filename: `${page}.jpg`,
    };
  });
});

const currentInfoUrl = computed(() => {
  if (div.value) return '';
  const canvasIndex = currentPage.value - 1;
  const canvas = canvases.value[canvasIndex];
  if (!canvas) return '';
  const resource = canvas.images?.[0]?.resource || canvas.items?.[0]?.items?.[0]?.body;
  const service = Array.isArray(resource?.service) ? resource.service[0] : resource?.service;
  const serviceId = service?.['@id'] || service?.id || '';
  return serviceId ? `${serviceId}/info.json` : '';
});

const clampPage = (value: number) => {
  if (!Number.isFinite(value) || value < 1) return 1;
  if (!totalPage.value) return Math.max(1, Math.trunc(value));
  return Math.min(totalPage.value, Math.max(1, Math.trunc(value)));
};

const showNotification = (message: string) => {
  notificationMessage.value = message;
  if (notificationTimer) window.clearTimeout(notificationTimer);
  notificationTimer = window.setTimeout(() => {
    notificationMessage.value = '';
  }, 2200);
};

const refreshTagState = async () => {
  if (!props.book?.id) return;
  allTagNames.value = await retrieveAllTagNames();
  attachedTagNames.value = (await retrieveAllObjectByBookId(props.book.id)).map((tag) => tag.tagName);
};

const tagButtonHandler = async () => {
  isTaggingModalActive.value = true;
  if (!checkTagPermission()) {
    const confirmed = window.confirm(labels.tagPermission);
    if (!confirmed) {
      isTaggingModalActive.value = false;
      return;
    }
    setTagPermission();
  }
  await refreshTagState();
};

const tagClickedHandler = async (tagName: string) => {
  if (!props.book?.id || !tagName) return;

  if (attachedTagNames.value.includes(tagName)) {
    await deleteBookIdByTagName({
      bookId: props.book.id,
      tagName,
    });
  } else {
    await pushBookIdByTagName({
      bookId: props.book.id,
      tagName,
    });
  }

  await refreshTagState();
};

const tagAddHandler = async () => {
  const tagName = tagAddInput.value.trim();
  if (!props.book?.id || !tagName) return;

  const currentAllTagNames = await retrieveAllTagNames();
  if (currentAllTagNames.includes(tagName)) {
    await pushBookIdByTagName({
      bookId: props.book.id,
      tagName,
    });
  } else {
    await putTagObject({
      tagName,
      bookIds: [props.book.id],
    });
  }

  tagAddInput.value = '';
  await refreshTagState();
};

const applyPage = (value: number) => {
  const nextPage = clampPage(value);
  currentPage.value = nextPage;
  inputPageModel.value = String(nextPage);
  if (nextPage !== props.page) emit('update:page', nextPage);
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
  if (currentPage.value < totalPage.value) applyPage(currentPage.value + 1);
};

const previous = () => {
  if (currentPage.value > 1) applyPage(currentPage.value - 1);
};

const handleLeftButton = () => {
  if (leftOpen.value) previous();
  else next();
};

const handleRightButton = () => {
  if (leftOpen.value) next();
  else previous();
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

const changeDirection = () => {
  leftOpen.value = !leftOpen.value;
  directionState.value = 'manual';
};

const changethparam = () => {
  if (typeof props.book?.contrastparam === 'number') {
    th.value = props.book.contrastparam;
  }
};

const filterParams = computed(() => {
  let param = '';
  const a = 10;
  for (let r = 0; r < 256; r += 1) {
    if (r !== 0) param += ' ';
    param += 1.0 / (1.0 + Math.exp((-a * (r - th.value)) / 255));
  }
  return param;
});

const showTh = () => {
  showThParam.value = !showThParam.value;
};

const syncBodyScroll = () => {
  if (!import.meta.client) return;
  document.body.style.overflow = full.value ? 'hidden' : '';
};

const clearTextAreaRectangles = () => {
  textAreaRectangles.forEach((rectangle) => rectangle.remove());
  textAreaRectangles = [];
};

const clearSelectedAreaRectangle = () => {
  if (selectedAreaRectangle) {
    selectedAreaRectangle.remove();
    selectedAreaRectangle = null;
  }
};

const exitTextDisplayMode = () => {
  clearTextAreaRectangles();
  textDisplay.value = false;
};

const exitSelectMode = () => {
  selectAreaFlag.value = false;
  clearSelectedAreaRectangle();
  clearTextAreaRectangles();
  if (!map) return;
  map.dragging.enable();
  map.off('mousedown', mousedownHandler);
  map.off('mousemove', mousemoveHandler);
  map.off('mouseup', mouseupHandler);
  map.off('mouseout', mouseoutHandler);
  map.off('mouseover', mouseoverHandler);
};

const exitCopyMode = () => {
  copyMode.value = false;
  tableMode.value = false;
  isCopyModalActive.value = false;
  tableHtml.value = '';
  tableRecLoading.value = false;
  exitSelectMode();
};

const changeFull = async () => {
  full.value = !full.value;
  syncBodyScroll();
  await nextTick();
  if (map) {
    map.invalidateSize();
    fitBounds();
  }
};

const changeDiv = () => {
  exitTextDisplayMode();
  exitCopyMode();
  div.value = !div.value;
  if (!div.value) applyPage(Math.round(currentPage.value / 2));
  else applyPage(currentPage.value * 2 - 1);
};

const highlightKeyword = (text: string, keyword: string) => text.replace(keyword, `<span style="background:yellow">${keyword}</span>`);

const escapeHTML = (value: string) => value.replace(/[&'`"<>]/g, (match) => ({
  '&': '&amp;',
  '\'': '&#x27;',
  '`': '&#x60;',
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
}[match] || match));

const iiifUrlRaw = (pid: string, page: number, x: number, y: number, w: number, h: number, targetHeight: number) => {
  const formattedPage = (`0000000000${page}`).slice(-7);
  return `https://www.dl.ndl.go.jp/api/iiif/${pid}/R${formattedPage}/pct:${x},${y},${w},${h}/,${targetHeight}/0/default.jpg`;
};

const clearLayers = () => {
  if (!map) return;
  map.eachLayer((layer: any) => {
    map.removeLayer(layer);
  });
};

const currentImageBounds = () => {
  if (!map || !LRef || initialZoom == null || !imageWidth || !imageHeight) return null;
  const southWest = map.unproject([0, imageHeight], initialZoom);
  const northEast = map.unproject([imageWidth, 0], initialZoom);
  return new LRef.LatLngBounds(southWest, northEast);
};

const fitBounds = () => {
  if (map) {
    map.invalidateSize();
  }

  if (div.value && map && bounds) {
    map.fitBounds(bounds, { animate: false });
    return;
  }

  const imageBounds = currentImageBounds();
  if (map && imageBounds) {
    map.fitBounds(imageBounds, { animate: false });
    return;
  }

  if (iiifLayer && typeof iiifLayer._fitBounds === 'function') {
    iiifLayer._fitBounds();
  }
};

const fitBoundsAfterLayout = async () => {
  await nextTick();
  window.requestAnimationFrame(() => {
    fitBounds();
  });
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
  imageWidth = Number(infojson.width || 0);
  imageHeight = Number(infojson.height || 0);
};

const pointToLatLng = (x: number, y: number) => {
  if (!map || initialZoom == null) return null;
  return map.unproject([x, y], initialZoom);
};

const latLngToPoint = (latLng: any) => {
  if (!map || initialZoom == null) return null;
  return map.project(latLng, initialZoom);
};

const setUrl = async (src: string) => {
  if (!map || !LRef) return;
  clearLayers();
  clearTextAreaRectangles();
  clearSelectedAreaRectangle();
  map.setMaxZoom(6);
  map.setMinZoom(1);

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      window.setTimeout(() => {
        const southWest = map.unproject([0, img.height], map.getMaxZoom() - 1);
        const northEast = map.unproject([img.width, 0], map.getMaxZoom() - 1);
        bounds = new LRef!.LatLngBounds(southWest, northEast);
        overlay = LRef!.imageOverlay(src, bounds);
        overlay.addTo(map);
        map.fitBounds(bounds, { animate: false });
        resolve();
      }, 250);
    };
    img.src = src;
  });
};

const fetchCoordjson = async (pageId: string) => {
  if (coordjsonCache.pageId === pageId) return coordjsonCache.data;
  const pageData = await useApiFetch<Page>(`/page/${pageId}`);
  coordjsonCache = {
    pageId,
    data: pageData.coordjson ? (JSON.parse(pageData.coordjson) as CoordjsonContent[]) : [],
  };
  return coordjsonCache.data;
};

const selectedCoordData = computed(() => {
  let data = coordjsonCache.data;

  if (shouldDivideByCenter.value) {
    const leftPageData: CoordjsonContent[] = [];
    const rightPageData: CoordjsonContent[] = [];
    data.forEach((item) => {
      if (item.xmax < centerAxisX.value) leftPageData.push(item);
      else rightPageData.push(item);
    });
    data = leftPageData.concat(rightPageData);
  }

  if (shouldIgnoreRuby.value) {
    data = data.filter(({ xmax, xmin, ymax, ymin }) => (xmax - xmin) * (ymax - ymin) > rubySize.value * 100);
  }

  return data.filter(({ xmin, ymin, xmax, ymax }) => (
    selectedCoordinates.value.maxX > xmax &&
    selectedCoordinates.value.maxY > ymax &&
    selectedCoordinates.value.minX < xmin &&
    selectedCoordinates.value.minY < ymin
  ));
});

const selectedTextPlain = computed(() => selectedCoordData.value.map(({ contenttext }) => (
  shouldInsertSpace.value ? `${contenttext} ` : contenttext
)).join(''));

const selectedTextHtml = computed(() => {
  let text = escapeHTML(selectedTextPlain.value);
  const keywords = props.keywords?.filter((keyword) => text.includes(keyword)) || [];
  if (keywords.length > 0) {
    const regexp = new RegExp(`(${keywords.join('|')})`, 'g');
    text = text.replace(regexp, '<em style="background-color: #f5b12e;">$1</em>');
  }
  return text;
});

const copySelectedText = async (targetText: string) => {
  const suffix = `${targetText.slice(0, 12)}${targetText.length > 12 ? '...' : ''}`;
  try {
    await navigator.clipboard.writeText(targetText);
    showNotification(`${labels.copyDone}: ${suffix}`);
  } catch {
    showNotification(`${labels.copyFailed}: ${suffix}`);
  }
};
const drawRectangleOnTextArea = async (
  coordjson: CoordjsonContent[],
  options: { clickToCopy?: boolean; color?: string } = {},
) => {
  if (!map || !LRef) return;
  clearTextAreaRectangles();

  const { clickToCopy = false, color = '#0080ff' } = options;
  textAreaRectangles = coordjson
    .map(({ xmax, xmin, ymax, ymin, contenttext }) => {
      const startLatLng = pointToLatLng(xmin, ymin);
      const endLatLng = pointToLatLng(xmax, ymax);
      if (!startLatLng || !endLatLng) return null;

      const rectangle = LRef!.rectangle(
        [
          [startLatLng.lat, startLatLng.lng],
          [endLatLng.lat, endLatLng.lng],
        ],
        { color, weight: 1 },
      ).bindTooltip(contenttext);

      if (clickToCopy) {
        rectangle.on('click', () => {
          copySelectedText(contenttext);
        });
      }

      return rectangle.addTo(map);
    })
    .filter(Boolean);
};

const initializeTextDisplayMode = async () => {
  if (!currentPageId.value || div.value) return;
  exitCopyMode();
  textDisplay.value = true;
  const coordjson = await fetchCoordjson(currentPageId.value);
  await drawRectangleOnTextArea(coordjson, { clickToCopy: true, color: '#ff3300' });
};

const changeTextDisplayMode = async () => {
  if (textDisplay.value) {
    exitTextDisplayMode();
    return;
  }
  await initializeTextDisplayMode();
};

const setSelectedCoordinates = (pointA: any, pointB: any) => {
  const coordsA = latLngToPoint(pointA);
  const coordsB = latLngToPoint(pointB);
  if (!coordsA || !coordsB) return;

  selectedCoordinates.value = {
    minX: Math.min(coordsA.x, coordsB.x),
    minY: Math.min(coordsA.y, coordsB.y),
    maxX: Math.max(coordsA.x, coordsB.x),
    maxY: Math.max(coordsA.y, coordsB.y),
  };
};

const displaySelectedTextModal = () => {
  if (tableMode.value) {
    isCopyModalActive.value = true;
    return;
  }
  if (selectedTextPlain.value !== '') isCopyModalActive.value = true;
  else showNotification(labels.copyExtractFailed);
};
const initializeCopyMode = async () => {
  if (!currentPageId.value || div.value || !map) return;
  copyMode.value = true;
  tableMode.value = false;
  exitTextDisplayMode();
  fitBounds();

  const pageData = await useApiFetch<Page>(`/page/${currentPageId.value}`);
  await fetchCoordjson(currentPageId.value);

  window.setTimeout(() => {
    const mapBounds = map.getBounds();
    const northWest = latLngToPoint(mapBounds.getNorthWest());
    const southEast = latLngToPoint(mapBounds.getSouthEast());
    if (northWest && southEast && typeof pageData.divide === 'number') {
      centerAxisX.value = northWest.x + (southEast.x - northWest.x) * pageData.divide;
    }
    setSelectedCoordinates(mapBounds.getNorthEast(), mapBounds.getSouthWest());
    displaySelectedTextModal();
  }, 300);
};

const changeCopyMode = async () => {
  if (copyMode.value && !tableMode.value) {
    exitCopyMode();
    return;
  }
  await initializeCopyMode();
};

const initializeTableMode = async () => {
  if (!currentPageId.value || div.value || !map) return;
  copyMode.value = true;
  tableMode.value = true;
  tableHtml.value = labels.selectTableArea;
  exitTextDisplayMode();
  fitBounds();

  const pageData = await useApiFetch<Page>(`/page/${currentPageId.value}`);
  await fetchCoordjson(currentPageId.value);

  window.setTimeout(() => {
    const mapBounds = map.getBounds();
    const northWest = latLngToPoint(mapBounds.getNorthWest());
    const southEast = latLngToPoint(mapBounds.getSouthEast());
    if (northWest && southEast && typeof pageData.divide === 'number') {
      centerAxisX.value = northWest.x + (southEast.x - northWest.x) * pageData.divide;
    }
    setSelectedCoordinates(mapBounds.getNorthEast(), mapBounds.getSouthWest());
    isCopyModalActive.value = true;
  }, 300);
};

const changeTableMode = async () => {
  if (copyMode.value && tableMode.value) {
    exitCopyMode();
    return;
  }
  await initializeTableMode();
};

const drawRectangleOnSelectedArea = (startPoint: any, endPoint: any) => {
  if (!map || !LRef) return;
  clearSelectedAreaRectangle();
  selectedAreaRectangle = LRef.rectangle(
    [
      [startPoint.lat, startPoint.lng],
      [endPoint.lat, endPoint.lng],
    ],
    { color: '#ff7800', weight: 1 },
  ).addTo(map);
};

const mousedownHandler = (event: any) => {
  if (mouseupedInOutside.value) {
    mouseupedInOutside.value = false;
    return;
  }
  map.on('mouseout', mouseoutHandler);
  mousedownLatLng = event.latlng;
  isAreaSelecting.value = true;
};

const mousemoveHandler = (event: any) => {
  if (!isAreaSelecting.value) return;
  mouseupLatLng = event.latlng;
  drawRectangleOnSelectedArea(mousedownLatLng, mouseupLatLng);
};

const mouseoutHandler = () => {
  map.on('mouseover', mouseoverHandler);
};

const mouseoverHandler = (event: any) => {
  if (event.originalEvent.button === 0) mouseupedInOutside.value = true;
  map.off('mouseover', mouseoverHandler);
};

const mouseupHandler = async (event: any) => {
  if (!isAreaSelecting.value) return;

  map.off('mouseout', mouseoutHandler);
  map.off('mouseover', mouseoverHandler);

  mouseupLatLng = event.latlng;
  drawRectangleOnSelectedArea(mousedownLatLng, mouseupLatLng);
  isAreaSelecting.value = false;

  await fetchCoordjson(currentPageId.value);
  setSelectedCoordinates(mousedownLatLng, mouseupLatLng);
  displaySelectedTextModal();
};

const initializeSelectMode = async () => {
  if (!map || !currentPageId.value) return;
  selectAreaFlag.value = true;
  exitSelectMode();
  selectAreaFlag.value = true;
  isCopyModalActive.value = false;
  map.dragging.disable();
  map.on('mousedown', mousedownHandler);
  map.on('mousemove', mousemoveHandler);
  map.on('mouseup', mouseupHandler);

  const coordjson = await fetchCoordjson(currentPageId.value);
  await drawRectangleOnTextArea(coordjson);
};

const tableRecFunc = async () => {
  if (!props.book?.id || !currentPageId.value) return;

  tableRecLoading.value = true;
  tableHtml.value = labels.extracting;

  try {
    const response = await fetch(runtimeConfig.public.tableRecEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        width: imageWidth,
        height: imageHeight,
        minX: selectedCoordinates.value.minX,
        minY: selectedCoordinates.value.minY,
        maxX: selectedCoordinates.value.maxX,
        maxY: selectedCoordinates.value.maxY,
        PID: props.book.id,
        koma: currentPage.value,
        coordjsonstr: selectedCoordData.value,
      }),
    });

    const result = await response.json();
    tableHtml.value = String(result.html || '');

    const content = tableFormat.value === 'TSV' ? String(result.tsv || '') : String(result.html || '');
    const mimeType = tableFormat.value === 'TSV' ? 'text/tsv' : 'text/html';
    const extension = tableFormat.value === 'TSV' ? 'tsv' : 'html';
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `table_${currentPageId.value}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error(error);
    tableHtml.value = labels.tableFailed;
    showNotification(labels.tableFailed);
  } finally {
    tableRecLoading.value = false;
  }
};

const addKeywordMarkers = async (pageId: string) => {
  if (!map || !LRef) return;

  if (markerLayer) map.removeLayer(markerLayer);
  markerLayer = new LRef.LayerGroup();

  if (!props.keywords?.length || div.value || !props.book?.id || !pageId) {
    markerLayer.addTo(map);
    return;
  }

  let pageData: Page;
  let analyzedPage: Page;

  try {
    [pageData, analyzedPage] = await Promise.all([
      useApiFetch<Page>(`/page/${pageId}`),
      useApiFetch<Page>(`/analyze/page/${pageId}`),
    ]);
  } catch (error) {
    console.error(error);
    markerLayer.addTo(map);
    return;
  }

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
      const analyzedPos = analyzedText.indexOf(keyword);
      const targetPos = pos !== -1 ? pos : analyzedPos;
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
  clearTextAreaRectangles();
  clearSelectedAreaRectangle();
  map.setMaxZoom(Number.POSITIVE_INFINITY);
  map.setMinZoom(-5);
  iiifLayer = (LRef as any).tileLayer.iiif(infoUrl, {});
  map.addLayer(iiifLayer);
  if (iiifLayer?._infoPromise) await iiifLayer._infoPromise;
};

const setCurrentIiifPage = async (pageNumber: number) => {
  if (!manifest.value || pageNumber <= 0 || !map) return;

  if (div.value) {
    const pageData = await useApiFetch<Page>(`/page/${currentSourcePageId.value}`);
    const height = (leafletHost.value?.clientHeight || 0) * 2;

    if (
      pageData?.book &&
      pageData.page &&
      pageData.divide != null &&
      pageData.rectX != null &&
      pageData.rectY != null &&
      pageData.rectW != null &&
      pageData.rectH != null
    ) {
      if (pageNumber % 2 === 0) {
        await setUrl(iiifUrlRaw(pageData.book || props.book?.id || '', pageData.page, pageData.rectX, pageData.rectY, pageData.divide * 100 - pageData.rectX, pageData.rectH, height));
      } else {
        await setUrl(iiifUrlRaw(pageData.book || props.book?.id || '', pageData.page, pageData.divide * 100, pageData.rectY, pageData.rectX + pageData.rectW - pageData.divide * 100, pageData.rectH, height));
      }
    }
    return;
  }

  const infoUrl = currentInfoUrl.value;
  if (!infoUrl) return;

  await setInfo(infoUrl);
  await getInitialZoom(infoUrl);
  await fitBoundsAfterLayout();
  resolveDirection();
  if (props.book?.id) {
    await addKeywordMarkers(`${props.book.id}_${pageNumber}`);
  }
};

const loadManifest = async () => {
  if (!import.meta.client || !props.manifestUrl) return;

  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await fetch(props.manifestUrl, { credentials: 'omit' });
    if (!response.ok) throw new Error(`Failed to load manifest: ${response.status}`);
    manifest.value = (await response.json()) as IiifManifest;
    resolveDirection();
    applyPage(props.page || 1);
  } catch (error) {
    manifest.value = null;
    errorMessage.value = labels.manifestFailed;
    console.error(error);
  } finally {
    loading.value = false;
  }
};

watch(() => props.page, (value) => {
  applyPage(value || 1);
});

watch(() => currentPage.value, (value, oldValue) => {
  if (oldValue && value !== oldValue) {
    exitTextDisplayMode();
    exitCopyMode();
  }
});

watch(() => rubySize.value, async () => {
  if (selectAreaFlag.value && currentPageId.value) {
    const coordjson = await fetchCoordjson(currentPageId.value);
    await drawRectangleOnTextArea(coordjson);
  }
});

watch(() => props.book?.leftopen, () => {
  resolveDirection();
});

watch(() => props.book?.id, async (bookId) => {
  if (!bookId) return;
  if (isTaggingModalActive.value) {
    await refreshTagState();
  }
});

watch(() => props.manifestUrl, () => {
  loadManifest();
});

watch(() => [currentPage.value, props.keywords?.join('|') || '', route.fullPath, div.value ? '1' : '0', props.book?.id || ''].join(':'), async () => {
  if (map && manifest.value) {
    await setCurrentIiifPage(currentPage.value);
  }
});

onMounted(async () => {
  await initMap();
  onKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName?.toLowerCase() || '';
    const isTypingTarget = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;

    if (event.key === 'Escape' && full.value) {
      changeFull();
      return;
    }

    if (isTypingTarget) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleLeftButton();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleRightButton();
    }
  };
  document.addEventListener('keydown', onKeydown);
  await loadManifest();
});

onBeforeUnmount(() => {
  if (inputTimer) window.clearTimeout(inputTimer);
  if (notificationTimer) window.clearTimeout(notificationTimer);
  if (onKeydown) document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<template>
  <section class="iiif-viewer" :class="{ 'is-full': full }">
    <div class="iiif-viewer-group">
      <button class="button is-small leftbutton" type="button" :disabled="!totalPage" @click="handleLeftButton">
        <span class="mdi mdi-chevron-double-left" aria-hidden="true"></span>
      </button>
      <div class="viewer-contrast" :class="{ blackwhite: bwflag }">
        <div ref="leafletHost" class="viewer"></div>
        <div v-if="loading" class="viewer-overlay-message">{{ labels.loadingManifest }}</div>
        <div v-else-if="errorMessage" class="viewer-overlay-message">{{ errorMessage }}</div>
        <div v-if="notificationMessage" class="viewer-toast">{{ notificationMessage }}</div>
      </div>
      <button class="button is-small rightbutton" type="button" :disabled="!totalPage" @click="handleRightButton">
        <span class="mdi mdi-chevron-double-right" aria-hidden="true"></span>
      </button>
      <div class="iiif-control-zoom buttons has-addons">
        <button
          v-show="!div"
          class="button is-large icon-button"
          type="button"
          :title="labels.tag"
          @click="tagButtonHandler()"
        >
          <span class="mdi mdi-tag" aria-hidden="true"></span>
        </button>
        <button class="button is-large icon-button" type="button" :title="labels.zoomOut" @click="map?.zoomOut()">
          <span class="mdi mdi-magnify-minus" aria-hidden="true"></span>
        </button>
        <button class="button is-large icon-button" type="button" :title="labels.fitBounds" @click="fitBounds()">
          <span class="mdi mdi-arrow-collapse-all" aria-hidden="true"></span>
        </button>
        <button class="button is-large icon-button" type="button" :title="labels.zoomIn" @click="map?.zoomIn()">
          <span class="mdi mdi-magnify-plus" aria-hidden="true"></span>
        </button>
        <button class="button is-large icon-button" type="button" :title="full ? labels.exitFullscreen : labels.fullscreen" @click="changeFull()">
          <span :class="['mdi', full ? 'mdi-fullscreen-exit' : 'mdi-fullscreen']" aria-hidden="true"></span>
        </button>
        <button
          v-show="!div"
          class="button is-large icon-button"
          type="button"
          :title="labels.textDisplay"
          :class="{ 'is-active': textDisplay }"
          @click="changeTextDisplayMode()"
        >
          <span class="mdi mdi-format-text" aria-hidden="true"></span>
        </button>
        <button
          v-show="!div"
          class="button is-large icon-button"
          type="button"
          :title="labels.textCopy"
          :class="{ 'is-active': copyMode && !tableMode }"
          @click="changeCopyMode()"
        >
          <span class="mdi mdi-clipboard-text" aria-hidden="true"></span>
        </button>
        <button
          v-show="!div"
          class="button is-large icon-button"
          type="button"
          :title="labels.tableExtract"
          :class="{ 'is-active': copyMode && tableMode }"
          @click="changeTableMode()"
        >
          <span class="mdi mdi-table" aria-hidden="true"></span>
        </button>
      </div>
      <div v-show="shouldIgnoreRuby && copyMode && !tableMode" class="iiif-control-right-bottom">
        <label class="ruby-size-panel">
          <span>{{ labels.rubySize }}</span>
          <input v-model="rubySize" type="range" min="0" max="1000" step="10" />
        </label>
      </div>
    </div>
    <div class="iiif-control-group">
      <div v-if="totalPage" class="iiif-control-page">
        <div v-if="leftOpen" class="page-control-row">
          <button class="button is-small iiif-next" type="button" :disabled="currentPage <= 1" @click="previous">
            <span class="mdi mdi-chevron-left" aria-hidden="true"></span>
            <span class="button-label">{{ labels.previous }}</span>
          </button>
          <input v-model="inputPageModel" class="input is-small iiif-inputpage" type="text" @blur="commitInputPage" @input="queueInputCommit" />
          <span class="iiif-total button is-small is-static">/{{ totalPage }}</span>
          <button class="button is-small iiif-prev" type="button" :disabled="currentPage >= totalPage" @click="next">
            <span class="button-label">{{ labels.next }}</span>
            <span class="mdi mdi-chevron-right" aria-hidden="true"></span>
          </button>
        </div>
        <div v-else class="page-control-row">
          <button class="button is-small iiif-prev" type="button" :disabled="currentPage >= totalPage" @click="next">
            <span class="mdi mdi-chevron-left" aria-hidden="true"></span>
            <span class="button-label">{{ labels.next }}</span>
          </button>
          <input v-model="inputPageModel" class="input is-small iiif-inputpage" type="text" @blur="commitInputPage" @input="queueInputCommit" />
          <span class="iiif-total button is-small is-static">/{{ totalPage }}</span>
          <button class="button is-small iiif-next" type="button" :disabled="currentPage <= 1" @click="previous">
            <span class="button-label">{{ labels.previous }}</span>
            <span class="mdi mdi-chevron-right" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <div class="direction-group">
        <span>{{ directionLabel }}</span>
        <span>{{ directionValue }}</span>
        <button class="button is-small" type="button" @click="changeDirection">{{ labels.swapDirection }}</button>
      </div>
      <div class="iiif-control-divide buttons has-addons">
        <button class="button is-small" type="button" @click="changeDiv">
          <span :class="['mdi', div ? 'mdi-locker' : 'mdi-locker-multiple']" aria-hidden="true"></span>
          <span class="button-label">{{ div ? labels.divideOff : labels.divideOn }}</span>
        </button>
      </div>
      <div class="iiif-control-download buttons has-addons">
        <button class="button is-small" type="button" :disabled="!downloadLink" @click="isDownloadModalActive = true">
          <span class="mdi mdi-download" aria-hidden="true"></span>
          <span class="button-label">{{ labels.currentPageImage }}</span>
        </button>
      </div>
      <nav class="readability-panel">
        <label class="checkbox readability-toggle" @click="changethparam()">
          <input v-model="bwflag" type="checkbox" />
          <span>{{ labels.readability }}</span>
        </label>
        <button class="button is-small" type="button" @click="showTh()">{{ labels.adjust }}</button>
        <input v-if="showThParam" v-model="th" class="threshold-slider" type="range" min="0" max="255" step="1" />
      </nav>
      <div class="book-download-group">
        <a v-if="fulltextLink" class="button is-small" :href="fulltextLink">
          <span class="mdi mdi-download" aria-hidden="true"></span>
          <span class="button-label">{{ labels.fulltextDownload }}</span>
        </a>
        <details class="image-downloads">
          <summary class="button is-small">
            <span class="mdi mdi-download" aria-hidden="true"></span>
            <span class="button-label">{{ labels.imageDownload }}</span>
          </summary>
          <div class="image-downloads-menu">
            <a
              v-for="item in komaarray"
              :key="item.page"
              class="image-download-item"
              :href="item.url"
              target="_blank"
              rel="noreferrer"
            >
              {{ item.page }} {{ t('コマ', 'page') }}
            </a>
          </div>
        </details>
      </div>
      <svg class="svg-filter-defs" xmlns="http://www.w3.org/2000/svg">
        <filter id="svgBlur">
          <feComponentTransfer>
            <feFuncR type="table" :tableValues="filterParams" />
            <feFuncG type="table" :tableValues="filterParams" />
            <feFuncB type="table" :tableValues="filterParams" />
          </feComponentTransfer>
          <feColorMatrix type="matrix" :values="colors" />
        </filter>
      </svg>
    </div>
    <div v-if="isTaggingModalActive" class="modal-backdrop" @click.self="isTaggingModalActive = false">
      <div class="modal-card tag-modal">
        <h3>{{ labels.tag }}</h3>
        <p v-if="book">{{ t(`${book.title} にタグを付与します。`, `Attach tags to ${book.title}.`) }}</p>
        <div class="tag-add-row">
          <input
            v-model="tagAddInput"
            class="input is-small tag-input"
            type="text"
            list="viewer-tag-options"
            @keydown.enter.prevent="tagAddHandler()"
          >
          <button class="button is-small" type="button" @click="tagAddHandler()">{{ labels.attach }}</button>
        </div>
        <datalist id="viewer-tag-options">
          <option v-for="tagName in filteredTagNameArray" :key="tagName" :value="tagName"></option>
        </datalist>
        <div class="tag-section">
          <div class="tag-chip-row">
            <button
              v-for="tagName in attachedTagNames"
              :key="`attached-${tagName}`"
              class="tag-chip is-attached"
              type="button"
              @click="tagClickedHandler(tagName)"
            >
              {{ tagName }}
            </button>
          </div>
        </div>
        <div class="tag-section">
          <div class="tag-chip-row">
            <button
              v-for="tagName in unattachedTags"
              :key="`unattached-${tagName}`"
              class="tag-chip"
              type="button"
              @click="tagClickedHandler(tagName)"
            >
              {{ tagName }}
            </button>
          </div>
          <p v-if="!attachedTagNames.length && !unattachedTags.length" class="tag-empty">{{ labels.noResults }}</p>
        </div>
        <div class="modal-actions">
          <button class="button is-small" type="button" @click="isTaggingModalActive = false">{{ labels.close }}</button>
        </div>
      </div>
    </div>
    <div v-if="isDownloadModalActive" class="modal-backdrop" @click.self="isDownloadModalActive = false">
      <div class="modal-card">
        <h3>{{ labels.imageDownloadTitle }}</h3>
        <p>{{ labels.imageDownloadDescription }}</p>
        <div class="modal-actions">
          <a class="button is-small" :href="downloadLink">{{ labels.download }}</a>
          <button class="button is-small" type="button" @click="isDownloadModalActive = false">{{ labels.close }}</button>
        </div>
      </div>
    </div>
    <div v-if="isCopyModalActive" class="modal-backdrop" @click.self="exitCopyMode()">
      <div class="modal-card copy-modal">
        <div v-if="tableMode" class="copy-content" v-html="tableHtml"></div>
        <div v-else class="copy-content" v-html="selectedTextHtml"></div>
        <div class="modal-actions">
          <button v-if="!tableMode" class="button is-small" type="button" @click="copySelectedText(selectedTextPlain)">{{ labels.copy }}</button>
          <button class="button is-small" type="button" @click="initializeSelectMode()">{{ labels.rangeSelect }}</button>
          <select v-if="tableMode && selectAreaFlag" v-model="tableFormat" class="input is-small table-format">
            <option value="HTML">HTML</option>
            <option value="TSV">TSV</option>
          </select>
          <button v-if="tableMode && selectAreaFlag" class="button is-small" type="button" :disabled="tableRecLoading" @click="tableRecFunc()">
            {{ tableRecLoading ? labels.extracting : labels.tableExtract }}
          </button>
          <button class="button is-small" type="button" @click="exitCopyMode()">{{ labels.close }}</button>
        </div>
        <div v-if="!tableMode" class="copy-options">
          <label><input v-model="shouldInsertSpace" type="checkbox" /> {{ labels.insertSpace }}</label>
          <label><input v-model="shouldIgnoreRuby" type="checkbox" /> {{ labels.ignoreRuby }}</label>
          <label><input v-model="shouldDivideByCenter" type="checkbox" /> {{ labels.spreadSort }}</label>
        </div>
        <div v-if="!tableMode && shouldIgnoreRuby" class="ruby-size">
          <span>{{ labels.rubySize }}</span>
          <input v-model="rubySize" type="range" min="0" max="1000" step="10" />
        </div>
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
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  width: 100%;
}

.iiif-viewer.is-full {
  bottom: 0;
  height: 100vh;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 900;
}

.iiif-viewer-group {
  display: block;
  min-width: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.leftbutton,
.rightbutton {
  align-items: center;
  display: flex;
  height: 20%;
  justify-content: center;
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
  display: grid;
  gap: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  max-width: calc(100% - 1rem);
  opacity: 0.8;
  position: absolute;
  right: 0.5rem;
  top: 0;
  width: min(250px, calc(100% - 1rem));
  z-index: 800;
}

.iiif-control-right-bottom {
  bottom: 10%;
  opacity: 0.8;
  position: absolute;
  right: 5%;
  width: 300px;
  z-index: 800;
}

.icon-button {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  margin: 0;
  min-height: 2.6rem;
  min-width: 0;
  padding: 0;
  width: 100%;
}

.icon-button .mdi,
.leftbutton .mdi,
.rightbutton .mdi,
.iiif-control-group .mdi {
  font-size: 1rem;
}

.viewer-contrast {
  height: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.viewer-contrast.blackwhite {
  filter: url('#svgBlur');
}

.viewer {
  height: 100%;
  margin: 0;
  max-width: 100%;
  min-width: 0;
  width: 100%;
}

.iiif-viewer.is-full .viewer {
  height: 100vh;
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

.viewer-toast {
  background: rgba(15, 23, 42, 0.88);
  border-radius: 0.375rem;
  bottom: 1rem;
  color: #fff;
  left: 50%;
  max-width: min(80vw, 28rem);
  padding: 0.5rem 0.75rem;
  position: absolute;
  transform: translateX(-50%);
  z-index: 820;
}

.iiif-control-group {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  justify-content: center;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  padding: 0.35rem 0 0.45rem;
  position: relative;
  width: 100%;
}

.iiif-viewer.is-full .iiif-control-group {
  bottom: 0;
  position: fixed;
  z-index: 910;
}

.iiif-control-page,
.direction-group,
.iiif-control-divide,
.iiif-control-download,
.book-download-group {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  font-size: 0.8rem;
  min-width: 0;
  max-width: 100%;
}

.page-control-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  justify-content: center;
  min-width: 0;
}

.iiif-inputpage {
  font-size: 0.8rem;
  max-width: 2.5rem;
  min-width: 1.4rem;
  padding: 0.2rem 0.35rem;
  text-align: right;
}

.iiif-total.is-static {
  background: #f5f5f5;
  border: none;
  color: #334155;
  font-size: 0.78rem;
  min-height: 1.85rem;
  padding: 0.25rem 0.45rem;
}

.button-label {
  margin-left: 0.2rem;
  overflow-wrap: anywhere;
  white-space: normal;
}

.readability-panel {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.6rem;
  max-width: 100%;
}

.readability-toggle {
  align-items: center;
  display: inline-flex;
  gap: 0.4rem;
}

.threshold-slider {
  width: 140px;
}

.iiif-control-group .button,
.iiif-control-group :deep(.button) {
  font-size: 0.78rem;
  line-height: 1.1;
  min-height: 1.85rem;
  padding: 0.22rem 0.45rem;
}

.iiif-control-group .checkbox {
  font-size: 0.8rem;
  line-height: 1.2;
}

.direction-group,
.iiif-control-divide,
.iiif-control-download,
.readability-panel,
.book-download-group {
  gap: 0.35rem 0.5rem;
}

.ruby-size-panel {
  align-items: center;
  background: rgba(245, 245, 245, 0.92);
  border-radius: 0.375rem;
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
}

.ruby-size-panel input {
  flex: 1;
}

.image-downloads {
  position: relative;
}

.image-downloads summary {
  list-style: none;
}

.image-downloads summary::-webkit-details-marker {
  display: none;
}

.image-downloads-menu {
  background: #fff;
  border: 1px solid #d5dbe3;
  border-radius: 0.375rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  display: grid;
  gap: 0.25rem;
  max-height: 16rem;
  max-width: min(20rem, 90vw);
  min-width: min(10rem, 80vw);
  overflow-y: auto;
  padding: 0.5rem;
  position: absolute;
  right: 0;
  top: calc(100% + 0.25rem);
  z-index: 920;
}

.image-download-item {
  color: #1f2937;
  padding: 0.25rem 0.5rem;
  text-decoration: none;
}

.image-download-item:hover {
  background: #f3f4f6;
}

.svg-filter-defs {
  left: -99999px;
  position: absolute;
  top: -99999px;
}

:deep(.leaflet-container) {
  background-color: #1f2937;
}

:deep(.leaflet-tooltip) {
  background: rgba(34, 34, 34, 0.9);
  border: none;
  color: #fff;
}

.modal-backdrop {
  align-items: center;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  inset: 0;
  justify-content: center;
  position: fixed;
  z-index: 999;
}

.modal-card {
  background: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
  display: grid;
  gap: 1rem;
  max-width: 36rem;
  padding: 1.25rem;
  width: min(92vw, 36rem);
}

.modal-card h3,
.modal-card p {
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.copy-modal {
  max-height: 80vh;
  overflow: auto;
}

.tag-modal {
  max-height: 80vh;
  overflow: auto;
}

.tag-add-row {
  display: flex;
  gap: 0.5rem;
}

.tag-input {
  flex: 1 1 auto;
}

.tag-section {
  display: grid;
  gap: 0.5rem;
}

.tag-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-chip {
  background: #1f2937;
  border: 1px solid #1f2937;
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  font: inherit;
  padding: 0.35rem 0.75rem;
}

.tag-chip.is-attached {
  background: #16a34a;
  border-color: #16a34a;
}

.tag-empty {
  color: #64748b;
  margin: 0;
}

.copy-content {
  line-height: 1.7;
  white-space: pre-wrap;
}

.copy-options {
  display: grid;
  gap: 0.5rem;
}

.ruby-size {
  align-items: center;
  display: flex;
  gap: 0.75rem;
}

.ruby-size input {
  flex: 1;
}

.table-format {
  width: auto;
}

@media (max-width: 980px) {
  .viewer {
    height: 70vh;
  }

  .iiif-control-zoom {
    width: min(250px, calc(100% - 1rem));
  }

  .iiif-control-group {
    flex-wrap: wrap;
  }

  .page-control-row,
  .readability-panel,
  .book-download-group {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>


