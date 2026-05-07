<script setup lang="ts">
definePageMeta({ name: 'illustsearch' });

const migration = useRouteMigration('illustsearch');
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);
</script>

<template>
  <main class="page-shell">
    <div class="page-title-row">
      <div>
        <h1>{{ t('画像検索', 'Illustration search') }}</h1>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <section class="panel">
      <IllustSearchPanel />
    </section>
  </main>
</template>
