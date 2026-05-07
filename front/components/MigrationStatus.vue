<script setup lang="ts">
import type { MigrationStatus } from '~/types/migration';

const props = defineProps<{
  status: MigrationStatus;
}>();

const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);
const label = computed(() => (
  props.status === 'migrated'
    ? t('移植済み', 'Migrated')
    : t('旧実装', 'Legacy')
));
</script>

<template>
  <span class="migration-status" :class="`is-${status}`">{{ label }}</span>
</template>

<style scoped>
.migration-status {
  border: 1px solid #c8d3df;
  border-radius: 999px;
  color: #314155;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  padding: 0.38rem 0.62rem;
}

.migration-status.is-migrated {
  background: #e9f8ef;
  border-color: #9fd5b1;
  color: #1f6a3a;
}

.migration-status.is-legacy {
  background: #fff4de;
  border-color: #e3bc73;
  color: #755218;
}
</style>
