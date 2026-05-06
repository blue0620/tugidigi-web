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

watch(() => props.size, (value) => {
  localSize.value = value;
});

watch(() => props.sort, (value) => {
  localSort.value = value || '';
});

const apply = () => {
  emit('update', {
    size: localSize.value,
    sort: localSort.value,
  });
};
</script>

<template>
  <div class="search-controls">
    <label class="control-label">
      <span>表示件数</span>
      <select v-model.number="localSize" class="select" @change="apply">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
    </label>

    <label v-if="showSort" class="control-label">
      <span>ソート</span>
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
  gap: 0.5rem 0.75rem;
  justify-content: flex-end;
}

.control-label {
  color: #53657a;
  display: grid;
  font-size: 0.82rem;
  gap: 0.2rem;
  min-width: 108px;
}

.select {
  min-height: 2rem;
  padding: 0.2rem 1.75rem 0.2rem 0.45rem;
}
</style>
