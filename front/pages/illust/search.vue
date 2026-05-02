<script setup lang="ts">
definePageMeta({ name: 'illustsearchres' });

const route = useRoute();
const migration = useRouteMigration('illustsearchres');
const { asStringArray } = useQueryParams();

const keywords = computed(() => asStringArray(route.query.keyword));
const images = computed(() => asStringArray(route.query.image));
const imageUrl = computed(() => String(route.query.imageurl || ''));
</script>

<template>
  <main class="page-shell">
    <div class="page-title-row">
      <div>
        <h1>画像検索結果</h1>
        <p class="lead">検索結果ページの Nuxt3 化を開始しました。検索条件の URL 互換を先に固定しています。</p>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <section class="panel">
      <h2>検索条件</h2>
      <ul class="result-list">
        <li class="result-item">keyword: {{ keywords.join(', ') || '-' }}</li>
        <li class="result-item">image: {{ images.join(', ') || '-' }}</li>
        <li class="result-item">imageurl: {{ imageUrl || '-' }}</li>
      </ul>
    </section>

    <IllustResults />
  </main>
</template>
