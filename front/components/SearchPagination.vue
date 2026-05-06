<script setup lang="ts">
const props = defineProps<{
  total: number;
  from: number;
  size: number;
}>();

const emit = defineEmits<{
  change: [from: number];
}>();

const totalRef = computed(() => props.total);
const fromRef = computed(() => props.from);
const sizeRef = computed(() => props.size);
const { currentPage, pageCount, canGoPrevious, canGoNext } = usePagination(totalRef, fromRef, sizeRef);

const previous = () => {
  if (canGoPrevious.value) emit('change', Math.max(0, props.from - props.size));
};

const next = () => {
  if (canGoNext.value) emit('change', props.from + props.size);
};
</script>

<template>
  <nav class="search-pagination" aria-label="Search result pages">
    <button class="button is-secondary" type="button" :disabled="!canGoPrevious" @click="previous">前へ</button>
    <span>{{ currentPage }} / {{ pageCount }}</span>
    <button class="button is-secondary" type="button" :disabled="!canGoNext" @click="next">次へ</button>
  </nav>
</template>

<style scoped>
.search-pagination {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.search-pagination :deep(.button) {
  min-height: 2rem;
  padding: 0.2rem 0.7rem;
}

button:disabled {
  cursor: default;
  opacity: 0.45;
}
</style>
