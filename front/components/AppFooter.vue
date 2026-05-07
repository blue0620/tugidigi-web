<script setup lang="ts">
const appConfig = useAppConfig();
const { $appRuntime } = useNuxtApp();
const serviceName = computed(() => $appRuntime.t(appConfig.service.nameJa, appConfig.service.name));
</script>

<template>
  <footer class="app-footer">
    <strong>{{ serviceName }}</strong>
    <button type="button" @click="$appRuntime.setLang($appRuntime.lang.value === 'ja' ? 'en' : 'ja')">
      {{ $appRuntime.lang.value === 'ja' ? 'English' : '日本語' }}
    </button>
  </footer>
</template>

<style scoped>
.app-footer {
  align-items: center;
  background: #eef2f6;
  color: #3a4b60;
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 3rem;
  min-height: 90px;
  padding: 1rem;
}

button {
  background: transparent;
  border: 1px solid #aab8c8;
  border-radius: 6px;
  color: #30445d;
  cursor: pointer;
  padding: 0.45rem 0.75rem;
}
</style>
