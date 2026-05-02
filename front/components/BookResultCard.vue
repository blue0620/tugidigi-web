<script setup lang="ts">
import type { Book } from '~/types/domain';

const props = defineProps<{
  book: Book;
}>();

const thumbnailUrl = computed(() => {
  if (!props.book.id) return '';

  return `https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(props.book.id)}/R0000001/full/256,/0/default.jpg`;
});

const description = computed(() => {
  const values = [
    props.book.responsibility,
    props.book.creator,
    props.book.publisher,
    props.book.publishyear,
  ].filter(Boolean);

  return values.join(' / ');
});

const indexes = computed(() => props.book.index || props.book.autoTOCindex || []);
</script>

<template>
  <article class="book-card">
    <NuxtLink class="thumb-link" :to="{ name: 'book', params: { id: book.id } }" aria-label="資料詳細">
      <img v-if="thumbnailUrl" :src="thumbnailUrl" alt="" loading="lazy">
      <span v-else class="empty-thumb">No image</span>
    </NuxtLink>
    <div class="book-body">
      <h3>
        <NuxtLink :to="{ name: 'book', params: { id: book.id } }">{{ book.title || book.id }}</NuxtLink>
      </h3>
      <p v-if="description" class="muted">{{ description }}</p>
      <ul v-if="indexes.length" class="index-list">
        <li v-for="item in indexes.slice(0, 3)" :key="item">{{ item }}</li>
      </ul>
    </div>
  </article>
</template>

<style scoped>
.book-card {
  display: grid;
  gap: 1rem;
  grid-template-columns: 104px minmax(0, 1fr);
}

.thumb-link {
  align-items: center;
  background: #eef3f7;
  border: 1px solid #dbe3ed;
  border-radius: 6px;
  display: flex;
  height: 144px;
  justify-content: center;
  overflow: hidden;
}

.thumb-link img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.empty-thumb {
  color: #66788d;
  font-size: 0.85rem;
}

.book-body {
  min-width: 0;
}

h3 {
  font-size: 1.05rem;
  line-height: 1.5;
  margin: 0;
}

h3 a {
  color: #005eb8;
}

.index-list {
  color: #33475f;
  line-height: 1.6;
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
}

@media (max-width: 560px) {
  .book-card {
    grid-template-columns: 80px minmax(0, 1fr);
  }

  .thumb-link {
    height: 112px;
  }
}
</style>
