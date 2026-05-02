<script setup lang="ts">
const props = defineProps<{
  counts: Record<string, number>;
}>();

const entries = computed(() => {
  const rows = Object.entries(props.counts || {})
    .map(([year, count]) => ({ year, count }))
    .sort((left, right) => Number(left.year) - Number(right.year));
  const max = rows.reduce((acc, row) => Math.max(acc, row.count), 0) || 1;
  return rows.map((row) => ({
    ...row,
    width: `${Math.max(4, Math.round((row.count / max) * 100))}%`,
  }));
});
</script>

<template>
  <div class="ngram-viewer">
    <p v-if="!entries.length" class="muted">出版年分布はありません。</p>
    <ul v-else class="ngram-chart">
      <li v-for="entry in entries" :key="entry.year" class="ngram-row">
        <span class="year">{{ entry.year }}</span>
        <span class="bar-wrap">
          <span class="bar" :style="{ width: entry.width }"></span>
        </span>
        <span class="count">{{ entry.count }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ngram-chart {
  display: grid;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.ngram-row {
  align-items: center;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 4rem minmax(0, 1fr) 3rem;
}

.year,
.count {
  color: #475569;
  font-size: 0.82rem;
}

.count {
  text-align: right;
}

.bar-wrap {
  background: #edf2f7;
  display: block;
  height: 0.8rem;
}

.bar {
  background: #f87979;
  display: block;
  height: 100%;
  min-width: 0.4rem;
}
</style>
