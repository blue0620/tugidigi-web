<script setup lang="ts">
definePageMeta({ name: 'illustsearch' });

const migration = useRouteMigration('illustsearch');
</script>

<template>
  <main class="page-shell">
    <div class="page-title-row">
      <div>
        <h1>画像検索</h1>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <section class="panel">
      <IllustSearchPanel />
    </section>
  </main>
</template>
