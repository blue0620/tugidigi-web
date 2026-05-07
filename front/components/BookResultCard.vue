<script setup lang="ts">
import type { Book, Illustration } from '~/types/domain';
import { illustrationCropUrl } from '~/utils/illustration-image';
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

const props = defineProps<{
  book: Book;
  keywords?: string[];
  showIllustrations?: boolean;
}>();

const emit = defineEmits<{
  searchIllustration: [illustration: Illustration];
}>();

const thumbnailUrl = computed(() => {
  if (!props.book.id) return '';
  return `https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(props.book.id)}/R0000001/full/256,/0/default.jpg`;
});

const heading = computed(() => [props.book.title, props.book.volume].filter(Boolean).join(' '));

const metaLine = computed(() => {
  const values = [
    props.book.responsibility,
    props.book.publisher,
    props.book.publishyear ? String(props.book.publishyear) : '',
  ].filter(Boolean);
  return values.join(' ');
});

const detailLink = computed(() => ({
  name: 'book' as const,
  params: { id: props.book.id },
  query: props.keywords?.length ? { keyword: props.keywords } : undefined,
}));

const illustrations = computed(() => props.book.illusts || []);
const illustrationPageSize = 4;
const showIllustrationCarousel = computed(() => illustrations.value.length > illustrationPageSize);
const illustrationPage = ref(0);
const maxIllustrationPage = computed(() => Math.max(0, Math.ceil(illustrations.value.length / illustrationPageSize) - 1));
const visibleIllustrations = computed(() => {
  const start = illustrationPage.value * illustrationPageSize;
  return illustrations.value.slice(start, start + illustrationPageSize);
});

const illustrationBookLink = (illustration: Illustration) => ({
  name: 'book' as const,
  params: { id: illustration.pid },
  query: illustration.page ? { page: String(illustration.page) } : undefined,
});

const openIllustrationPage = (illustration: Illustration) => {
  if (!illustration.pid) return;
  navigateTo(illustrationBookLink(illustration));
};

watch(
  () => illustrations.value.length,
  () => {
    if (illustrationPage.value > maxIllustrationPage.value) {
      illustrationPage.value = maxIllustrationPage.value;
    }
  },
);

const changeIllustrationPage = (direction: 'prev' | 'next') => {
  if (direction === 'prev') {
    illustrationPage.value = Math.max(0, illustrationPage.value - 1);
    return;
  }
  illustrationPage.value = Math.min(maxIllustrationPage.value, illustrationPage.value + 1);
};
</script>

<template>
  <article class="book-entry">
    <figure class="thumb-column">
      <NuxtLink class="thumb-frame" :to="detailLink" aria-label="資料詳細">
        <img v-if="thumbnailUrl" :src="thumbnailUrl" alt="" loading="lazy">
        <span v-else class="empty-thumb">{{ t('画像なし', 'No image') }}</span>
      </NuxtLink>
    </figure>

    <div class="entry-body">
      <p class="title-line">
        <strong>
          <NuxtLink :to="detailLink">{{ heading || book.id }}</NuxtLink>
        </strong>
        <br>
        <small v-if="metaLine">{{ metaLine }}</small>
      </p>

      <div v-if="book.highlights?.length" class="highlights">
        <p v-for="(highlight, index) in book.highlights" :key="`${book.id}-hl-${index}`" v-html="highlight"></p>
      </div>

      <div v-if="showIllustrations && illustrations.length" class="illustrations">
        <p class="illustration-label">{{ t('この資料の中の図表', 'Illustrations in this material') }}</p>
        <div class="illustration-carousel">
          <button
            v-if="showIllustrationCarousel"
            class="carousel-button"
            type="button"
            aria-label="前へ"
            :disabled="illustrationPage === 0"
            @click="changeIllustrationPage('prev')"
          >
            <span class="mdi mdi-chevron-left" aria-hidden="true"></span>
          </button>
          <div class="illustration-strip">
            <article
              v-for="illustration in visibleIllustrations"
              :key="illustration.id"
              class="illustration-chip"
            >
              <button class="chip-image" type="button" @click="openIllustrationPage(illustration)">
                <img :src="illustrationCropUrl(illustration, 128)" alt="" loading="lazy">
              </button>
              <div class="chip-actions">
                <a class="chip-action" href="" @click.prevent="emit('searchIllustration', illustration)">
                  <span class="mdi mdi-magnify" aria-hidden="true"></span>
                  <span>Search</span>
                </a>
                <NuxtLink class="chip-action" :to="illustrationBookLink(illustration)">
                  <span class="mdi mdi-book-open-variant" aria-hidden="true"></span>
                  <span>Book</span>
                </NuxtLink>
                <a class="chip-action" :href="illustrationCropUrl(illustration)" target="_blank" rel="noreferrer">
                  <span class="mdi mdi-download" aria-hidden="true"></span>
                  <span>Get</span>
                </a>
              </div>
            </article>
          </div>
          <button
            v-if="showIllustrationCarousel"
            class="carousel-button"
            type="button"
            aria-label="次へ"
            :disabled="illustrationPage >= maxIllustrationPage"
            @click="changeIllustrationPage('next')"
          >
            <span class="mdi mdi-chevron-right" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.book-entry {
  display: grid;
  gap: 1rem;
  grid-template-columns: 128px minmax(0, 1fr);
}

.thumb-column {
  margin: 0;
}

.thumb-frame {
  background: #fff;
  border: 1px solid #d8dee8;
  display: block;
  height: 128px;
  overflow: hidden;
  width: 128px;
}

.thumb-frame img {
  display: block;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.empty-thumb {
  align-items: center;
  color: #66788d;
  display: flex;
  height: 100%;
  justify-content: center;
}

.entry-body {
  min-width: 0;
}

.title-line {
  margin: 0;
}

.title-line strong {
  font-size: 1rem;
  line-height: 1.5;
}

.title-line a {
  color: #004a98;
  text-decoration: none;
}

.title-line small {
  color: #516273;
  display: inline-block;
  margin-top: 0.2rem;
}

.highlights {
  margin-top: 0.55rem;
}

.highlights p {
  color: #1f2937;
  line-height: 1.7;
  margin: 0.3rem 0 0;
}

.highlights :deep(em),
.highlights :deep(strong) {
  background: #fff3a3;
  font-style: normal;
  font-weight: 700;
}

.illustrations {
  margin-top: 0.8rem;
}

.illustration-label {
  color: #374151;
  font-size: 0.92rem;
  margin: 0 0 0.45rem;
}

.illustration-carousel {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.illustration-strip {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(4, minmax(0, 250px));
  padding-bottom: 0.2rem;
}

.carousel-button {
  align-items: center;
  appearance: none;
  background: #fff;
  border: 1px solid #d8dee8;
  color: #4b5563;
  cursor: pointer;
  display: inline-flex;
  height: 2rem;
  justify-content: center;
  padding: 0;
  width: 2rem;
}

.carousel-button:disabled {
  cursor: default;
  opacity: 0.35;
}

.carousel-button .mdi {
  font-size: 1.1rem;
}

.illustration-chip {
  height: 168px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 250px;
}

.chip-image {
  background: #fff;
  border: 1px solid #d8dee8;
  cursor: pointer;
  display: grid;
  padding: 0.35rem;
  width: 100%;
}

.chip-image img {
  background: #f6f7fb;
  display: block;
  height: 92px;
  object-fit: contain;
  width: 100%;
}

.chip-actions {
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  gap: 0;
  height: 1.25rem;
  margin-top: 0.2rem;
  width: 100%;
}

.chip-action {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 0;
  color: #4b5563;
  cursor: pointer;
  display: inline-flex;
  flex: 1 1 0;
  font-family: inherit;
  font-size: 0.76rem;
  gap: 0.18rem;
  justify-content: center;
  line-height: 1.1;
  min-width: 0;
  padding: 0;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
}

.chip-action .mdi {
  font-size: 0.9rem;
  line-height: 1;
}

@media (max-width: 640px) {
  .book-entry {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .thumb-frame {
    height: 96px;
    width: 96px;
  }

  .illustration-strip {
    grid-template-columns: 1fr;
  }
}
</style>
