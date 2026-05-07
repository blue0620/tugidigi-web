<script setup lang="ts">
import type { Illustration } from '~/types/domain';
import { illustrationCropUrl } from '~/utils/illustration-image';
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

const props = defineProps<{
  illustration: Illustration;
  compact?: boolean;
}>();

const emit = defineEmits<{
  search: [illustration: Illustration];
  searchTag: [payload: { illustration: Illustration; tag: string }];
}>();

const tags = computed(() => (
  props.illustration.graphictags?.slice().sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 3) || []
));

const imageUrl = computed(() => illustrationCropUrl(props.illustration, 280));
const fullImageUrl = computed(() => illustrationCropUrl(props.illustration));
const bookLink = computed(() => ({
  name: 'book' as const,
  params: { id: props.illustration.pid },
  query: { page: String(props.illustration.page || 1) },
}));
</script>

<template>
  <article class="illust-card" :class="{ compact }">
    <button class="image-frame" type="button" @click="navigateTo(bookLink)">
      <img v-if="imageUrl" :src="imageUrl" alt="" loading="lazy">
      <span v-else class="empty-image">{{ t('画像なし', 'No image') }}</span>
    </button>

    <div v-if="!compact" class="tag-buttons">
      <button
        v-for="tag in tags"
        :key="tag.tagname"
        type="button"
        @click="emit('searchTag', { illustration, tag: tag.tagname })"
      >
        {{ tag.tagname }}
      </button>
    </div>

    <div v-if="!compact" class="action-row">
      <button class="action-link" type="button" @click="emit('search', illustration)">
        <span class="mdi mdi-magnify" aria-hidden="true"></span>
        <span>Search</span>
      </button>
      <NuxtLink class="action-link" :to="bookLink">
        <span class="mdi mdi-book-open-variant" aria-hidden="true"></span>
        <span>Book</span>
      </NuxtLink>
      <a class="action-link" :href="fullImageUrl" target="_blank" rel="noreferrer">
        <span class="mdi mdi-download" aria-hidden="true"></span>
        <span>Get</span>
      </a>
    </div>
  </article>
</template>

<style scoped>
.illust-card {
  background: #fff;
  display: grid;
  gap: 0.45rem;
  height: 250px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
  max-width: 320px;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.image-frame {
  background: #fff;
  border: 1px solid #d8dee8;
  cursor: pointer;
  padding: 0.35rem;
}

.image-frame img {
  display: block;
  height: 180px;
  object-fit: contain;
  width: 100%;
}

.empty-image {
  color: #66788d;
  display: block;
  padding: 2rem 0;
  text-align: center;
}

.tag-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0 0.35rem;
}

.tag-buttons button {
  background: #eef5ff;
  border: 0;
  color: #0f4c81;
  cursor: pointer;
  font-size: 0.76rem;
  padding: 0.18rem 0.4rem;
}

.action-row {
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  display: grid;
  gap: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  height: 1.05rem;
  padding: 0 0.05rem 0.15rem;
}

.action-link {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 0;
  color: #4b5563;
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: 0.7rem;
  gap: 0.08rem;
  justify-content: center;
  line-height: 1;
  min-width: 0;
  padding: 0;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
}

.action-link .mdi {
  font-size: 0.76rem;
  line-height: 1;
}

.compact {
  max-width: 320px;
  width: 100%;
}

.compact .tag-buttons,
.compact .action-row {
  display: none;
}
</style>
