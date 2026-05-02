import type { Ref } from 'vue';

export const usePagination = (total: Ref<number>, from: Ref<number>, size: Ref<number>) => {
  const currentPage = computed(() => Math.floor(from.value / size.value) + 1);
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / size.value)));
  const canGoPrevious = computed(() => from.value > 0);
  const canGoNext = computed(() => currentPage.value < pageCount.value);

  return {
    currentPage,
    pageCount,
    canGoPrevious,
    canGoNext,
  };
};
