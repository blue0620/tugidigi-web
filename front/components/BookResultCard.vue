<script setup lang="ts">
import type { Book, Illustration } from '~/types/domain';

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

const openIllustrationPage = (illustration: Illustration) => {
  if (!illustration.pid) return;
  navigateTo({
    name: 'book',
    params: { id: illustration.pid },
    query: illustration.page ? { page: String(illustration.page) } : undefined,
  });
};
</script>

<template>
  <article class="book-entry">
    <figure class="thumb-column">
      <NuxtLink class="thumb-frame" :to="detailLink" aria-label="資料詳細">
        <img v-if="thumbnailUrl" :src="thumbnailUrl" alt="" loading="lazy">
        <span v-else class="empty-thumb">No image</span>
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
        <p class="illustration-label">この資料の中の図表</p>
        <div class="illustration-strip">
          <button
            v-for="illustration in illustrations"
            :key="illustration.id"
            class="illustration-chip"
            type="button"
            @click="openIllustrationPage(illustration)"
          >
            <img
              :src="`https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(illustration.pid)}/R${String(illustration.page || 1).padStart(7, '0')}/full/,128/0/default.jpg`"
              alt=""
              loading="lazy"
            >
            <span class="chip-actions">
              <span>{{ illustration.page ? `${illustration.page}コマ` : '図表' }}</span>
              <span class="chip-link" @click.stop="emit('searchIllustration', illustration)">類似検索</span>
            </span>
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

.illustration-strip {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
}

.illustration-chip {
  background: #fff;
  border: 1px solid #d8dee8;
  cursor: pointer;
  display: grid;
  gap: 0.25rem;
  min-width: 122px;
  padding: 0.35rem;
  text-align: left;
}

.illustration-chip img {
  background: #f6f7fb;
  display: block;
  height: 92px;
  object-fit: cover;
  width: 100%;
}

.chip-actions {
  color: #4b5563;
  display: flex;
  flex-direction: column;
  font-size: 0.76rem;
  gap: 0.15rem;
}

.chip-link {
  color: #005eb8;
}

@media (max-width: 640px) {
  .book-entry {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .thumb-frame {
    height: 96px;
    width: 96px;
  }
}
</style>
