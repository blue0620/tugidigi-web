<script setup lang="ts">
definePageMeta({ name: 'top' });

const migration = useRouteMigration('top');
const appConfig = useAppConfig();
const { url } = useAppUrl();
</script>

<template>
  <main class="page-shell">
    <div class="page-title-row">
      <div>
        <h1>{{ appConfig.service.nameJa }}</h1>
        <p class="lead">
          OCR テキストと図版検索を使って、国立国会図書館デジタルコレクション由来の資料を探索できます。
        </p>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <section class="top-actions">
      <NuxtLink class="action-card" to="/fulltext">
        <strong>全文から検索する</strong>
        <span>キーワード、著者、年代、NDC などで資料を探します。</span>
      </NuxtLink>
      <NuxtLink class="action-card is-red" to="/illust">
        <strong>画像から検索する</strong>
        <span>図版 ID、キーワード、画像 URL を使って類似画像を探します。</span>
      </NuxtLink>
    </section>

    <section class="panel top-about">
      <img :src="url('assets/images/ndl.png')" alt="" width="96">
      <div>
        <h2>Nuxt3 migration status</h2>
        <p>
          このトップ画面は Nuxt3 の <code>script setup</code> へ移植済みです。
          旧 Vue2 class component のページは段階的に置き換えます。
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.top-actions {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 1rem;
}

.action-card {
  background: #ffffff;
  border: 1px solid #c8d6e6;
  border-radius: 8px;
  color: #1d3551;
  display: grid;
  gap: 0.45rem;
  min-height: 132px;
  padding: 1.25rem;
  text-decoration: none;
}

.action-card strong {
  color: #005eb8;
  font-size: 1.25rem;
}

.action-card.is-red strong {
  color: #b3261e;
}

.action-card span {
  color: #53657a;
  line-height: 1.6;
}

.top-about {
  align-items: center;
  display: flex;
  gap: 1rem;
}

.top-about h2 {
  margin: 0 0 0.4rem;
}

.top-about p {
  color: #53657a;
  line-height: 1.7;
  margin: 0;
}

@media (max-width: 760px) {
  .top-actions {
    grid-template-columns: 1fr;
  }
}
</style>
