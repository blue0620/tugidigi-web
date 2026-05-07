<script setup lang="ts">
const appConfig = useAppConfig();
const { url } = useAppUrl();
const route = useRoute();
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

const navItems = computed(() => [
  { to: '/', label: t('ホーム', 'Home') },
  { to: '/fulltext', label: t('全文検索', 'Keyword search') },
  { to: '/illust', label: t('画像検索', 'Illustration search') },
  { to: '/mypage', label: t('マイページ', 'My Page') },
]);
const brandLabel = computed(() => ($appRuntime.lang.value === 'ja' ? appConfig.service.nameJa : appConfig.service.name));
const textModeLabel = computed(() => t('テキストモード', 'Text mode'));

const isOpen = ref(false);
const bookId = computed(() => (route.name === 'book' ? String(route.params.id || '') : ''));
const page = computed(() => String(route.query.page || '1'));

watch(
  () => route.fullPath,
  () => {
    isOpen.value = false;
  },
);
</script>

<template>
  <header class="app-header">
    <NuxtLink class="brand" to="/">
      <img :src="url('assets/images/logo.svg')" alt="" width="28" height="28">
      <span>{{ brandLabel }}</span>
    </NuxtLink>

    <button class="menu-button" type="button" :aria-expanded="isOpen" @click="isOpen = !isOpen">
      <span />
      <span />
      <span />
    </button>

    <nav class="nav" :class="{ 'is-open': isOpen }">
      <a
        v-if="bookId"
        class="nav-link"
        :href="`https://lab.ndl.go.jp/dl-text/book?pid=${bookId}&page=${page}`"
      >
        {{ textModeLabel }}
      </a>
      <NuxtLink v-for="item in navItems" :key="item.to" class="nav-link" :to="item.to">
        {{ item.label }}
      </NuxtLink>
      <button
        class="lang-button"
        type="button"
        @click="$appRuntime.setLang($appRuntime.lang.value === 'ja' ? 'en' : 'ja')"
      >
        {{ $appRuntime.lang.value === 'ja' ? 'EN' : 'JP' }}
      </button>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid #d9e1ea;
  display: flex;
  min-height: 58px;
  padding: 0 1.25rem;
  position: sticky;
  top: 0;
  z-index: 20;
}

.brand {
  align-items: center;
  color: #1f3146;
  display: inline-flex;
  font-weight: 800;
  gap: 0.55rem;
  text-decoration: none;
}

.nav {
  align-items: center;
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
}

.nav-link,
.lang-button {
  background: transparent;
  border: 0;
  color: #30445d;
  cursor: pointer;
  font: inherit;
  padding: 0.55rem 0.75rem;
  text-decoration: none;
}

.nav-link.router-link-active {
  color: #005eb8;
  font-weight: 700;
}

.menu-button {
  background: transparent;
  border: 0;
  display: none;
  flex-direction: column;
  gap: 4px;
  margin-left: auto;
  padding: 0.5rem;
}

.menu-button span {
  background: #30445d;
  display: block;
  height: 2px;
  width: 22px;
}

@media (max-width: 760px) {
  .app-header {
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 0.8rem 1rem;
  }

  .menu-button {
    display: flex;
  }

  .nav {
    display: none;
    flex-basis: 100%;
    flex-direction: column;
    margin-left: 0;
    padding-top: 0.75rem;
  }

  .nav.is-open {
    display: flex;
  }

  .nav-link,
  .lang-button {
    width: 100%;
  }
}
</style>
