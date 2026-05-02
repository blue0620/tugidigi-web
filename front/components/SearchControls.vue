<script setup lang="ts">
const props = defineProps<{
  size: number;
  sort?: string;
  showSort?: boolean;
}>();

const emit = defineEmits<{
  update: [value: { size: number; sort?: string }];
}>();

const localSize = ref(props.size);
const localSort = ref(props.sort || '');

watch(
  () => props.size,
  (value) => {
    localSize.value = value;
  },
);

watch(
  () => props.sort,
  (value) => {
    localSort.value = value || '';
  },
);

const apply = () => {
  emit('update', {
    size: localSize.value,
    sort: localSort.value,
  });
};
</script>

<template>
  <div class="search-controls">
    <label>
      表示件数
      <select v-model.number="localSize" class="select" @change="apply">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
    </label>
    <label v-if="showSort">
      ソート
      <select v-model="localSort" class="select" @change="apply">
        <option value="">一致度順</option>
        <option value="publishyear:asc">出版年 昇順</option>
        <option value="publishyear:desc">出版年 降順</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.search-controls {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
}

label {
  color: #53657a;
  display: grid;
  gap: 0.25rem;
  min-width: 140px;
}
</style>
