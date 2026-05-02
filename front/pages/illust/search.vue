<script setup lang="ts">
definePageMeta({ name: 'illustsearchres' });

const route = useRoute();
const migration = useRouteMigration('illustsearchres');
const { asStringArray } = useQueryParams();

const keywords = computed(() => asStringArray(route.query.keyword));
const imageId = computed(() => String(route.query.image || ''));
const imageUrl = computed(() => String(route.query.imageurl || ''));
const keyword2vec = computed(() => String(route.query.keyword2vec || ''));

const initialTab = computed<'sample' | 'metadata' | 'local' | 'url' | 'words'>(() => {
  if (keywords.value.length) return 'metadata';
  if (imageUrl.value) return 'url';
  if (keyword2vec.value) return 'words';
  return 'sample';
});
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
      <IllustSearchPanel
        :initial-keyword="keywords.join(' ')"
        :initial-url="imageUrl"
        :initial-keyword2vec="keyword2vec"
        :initial-tab="initialTab"
      />
    </section>

    <IllustResults />
  </main>
</template>
