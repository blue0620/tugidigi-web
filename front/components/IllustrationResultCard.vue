<script setup lang="ts">
import type { Illustration } from '~/types/domain';

const props = defineProps<{
  illustration: Illustration;
}>();

const imageUrl = computed(() => {
  if (!props.illustration.pid || !props.illustration.page) return '';
  const page = String(props.illustration.page).padStart(7, '0');

  return `https://www.dl.ndl.go.jp/api/iiif/${encodeURIComponent(props.illustration.pid)}/R${page}/full/280,/0/default.jpg`;
});

const tags = computed(() => props.illustration.graphictags?.map((tag) => tag.tagname).filter(Boolean) || []);
</script>

<template>
  <article class="illustration-card">
    <NuxtLink class="image-link" :to="{ name: 'book', params: { id: illustration.pid }, query: { page: illustration.page } }">
      <img v-if="imageUrl" :src="imageUrl" alt="" loading="lazy">
      <span v-else class="empty-image">No image</span>
    </NuxtLink>
    <div class="illustration-body">
      <h3>
        <NuxtLink :to="{ name: 'book', params: { id: illustration.pid }, query: { page: illustration.page } }">
          {{ illustration.title || illustration.pid }}
        </NuxtLink>
      </h3>
      <p class="muted">PID: {{ illustration.pid }}<span v-if="illustration.page"> / p.{{ illustration.page }}</span></p>
      <div v-if="tags.length" class="tag-row">
        <span v-for="tag in tags.slice(0, 6)" :key="tag">{{ tag }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.illustration-card {
  display: grid;
  gap: 1rem;
  grid-template-columns: 160px minmax(0, 1fr);
}

.image-link {
  align-items: center;
  background: #eef3f7;
  border: 1px solid #dbe3ed;
  border-radius: 6px;
  display: flex;
  height: 128px;
  justify-content: center;
  overflow: hidden;
}

.image-link img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.empty-image {
  color: #66788d;
  font-size: 0.85rem;
}

h3 {
  font-size: 1.05rem;
  line-height: 1.5;
  margin: 0;
}

h3 a {
  color: #005eb8;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.6rem;
}

.tag-row span {
  background: #e7f0f8;
  border-radius: 999px;
  color: #245174;
  font-size: 0.85rem;
  padding: 0.2rem 0.55rem;
}

@media (max-width: 560px) {
  .illustration-card {
    grid-template-columns: 1fr;
  }
}
</style>
