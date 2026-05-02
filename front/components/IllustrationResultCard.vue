<script setup lang="ts">
import type { Illustration } from '~/types/domain';

const props = defineProps<{
  illustration: Illustration;
  compact?: boolean;
}>();

const tags = computed(() => (
  props.illustration.graphictags?.slice().sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 3) || []
));

const imageUrl = computed(() => {
  if (!props.illustration.pid || !props.illustration.page) return '';
  const page = String(props.illustration.page).padStart(7, '0');
  return `https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(props.illustration.pid)}/R${page}/full/280,/0/default.jpg`;
});

const fullImageUrl = computed(() => {
  if (!props.illustration.pid || !props.illustration.page) return '';
  const page = String(props.illustration.page).padStart(7, '0');
  return `https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(props.illustration.pid)}/R${page}/full/full/0/default.jpg`;
});

const emit = defineEmits<{
  search: [illustration: Illustration];
  searchTag: [payload: { illustration: Illustration; tag: string }];
}>();
</script>

<template>
  <article class="illust-card" :class="{ compact }">
    <button class="image-frame" type="button" @click="navigateTo({ name: 'book', params: { id: illustration.pid }, query: { page: String(illustration.page || 1) } })">
      <img v-if="imageUrl" :src="imageUrl" alt="" loading="lazy">
      <span v-else class="empty-image">No image</span>
    </button>

    <div v-if="!compact" class="tag-buttons">
      <button v-for="tag in tags" :key="tag.tagname" type="button" @click="emit('searchTag', { illustration, tag: tag.tagname })">
        {{ tag.tagname }}
      </button>
    </div>

    <div v-if="!compact" class="action-row">
      <button type="button" @click="emit('search', illustration)">Search</button>
      <NuxtLink :to="{ name: 'book', params: { id: illustration.pid }, query: { page: String(illustration.page || 1) } }">Book</NuxtLink>
      <a :href="fullImageUrl" target="_blank" rel="noreferrer">Get</a>
    </div>
  </article>
</template>

<style scoped>
.illust-card {
  display: grid;
  gap: 0.45rem;
}

.image-frame {
  background: #fff;
  border: 1px solid #d8dee8;
  cursor: pointer;
  padding: 0.35rem;
}

.image-frame img {
  display: block;
  width: 100%;
}

.empty-image {
  color: #66788d;
  display: block;
  padding: 2rem 0;
  text-align: center;
}

.tag-buttons,
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag-buttons button,
.action-row button,
.action-row a {
  background: #eef5ff;
  border: 0;
  color: #0f4c81;
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0.24rem 0.5rem;
  text-decoration: none;
}

.action-row a {
  background: #f4f6f8;
  color: #334155;
}

.compact .tag-buttons,
.compact .action-row {
  display: none;
}
</style>
