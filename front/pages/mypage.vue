<script setup lang="ts">
definePageMeta({ name: 'mypage' });

const migration = useRouteMigration('mypage');
const { $notify } = useNuxtApp();

const sortOrder = ref('');
const historyDisabled = ref(false);
const localStorageAvailable = ref(true);
const history = ref<string[]>([]);

const readSettings = () => {
  try {
    localStorage.setItem('is_available_test', 'test');
    localStorage.removeItem('is_available_test');
    localStorageAvailable.value = true;
    sortOrder.value = localStorage.getItem('fulltext_default_sort') || '';
    historyDisabled.value = localStorage.getItem('is_viewed_book_history_disabled') === '1';
    history.value = historyDisabled.value
      ? []
      : (localStorage.getItem('viewed_book_history') || '').split(',').filter(Boolean);
  } catch (error) {
    localStorageAvailable.value = false;
    console.error(error);
  }
};

const saveSort = () => {
  localStorage.setItem('fulltext_default_sort', sortOrder.value);
  $notify('全文検索の既定ソートを保存しました。', 'success');
};

const saveHistorySetting = () => {
  if (historyDisabled.value) {
    localStorage.removeItem('viewed_book_history');
    history.value = [];
  }
  localStorage.setItem('is_viewed_book_history_disabled', historyDisabled.value ? '1' : '');
  $notify('閲覧履歴設定を保存しました。', 'success');
};

onMounted(readSettings);
</script>

<template>
  <main class="page-shell">
    <div class="page-title-row">
      <div>
        <h1>マイページ</h1>
        <p class="lead">旧 Mypage の localStorage 設定を Nuxt3 の Composition API で扱います。</p>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <section v-if="!localStorageAvailable" class="panel">
      <p>このブラウザでは localStorage を利用できません。</p>
    </section>

    <section v-else class="grid">
      <div class="panel grid">
        <h2>全文検索設定</h2>
        <div class="field">
          <label for="default-sort">既定のソート順</label>
          <select id="default-sort" v-model="sortOrder" class="select" @change="saveSort">
            <option value="">一致度順</option>
            <option value="publishyear:asc">出版年 昇順</option>
            <option value="publishyear:desc">出版年 降順</option>
          </select>
        </div>
      </div>

      <div class="panel grid">
        <h2>閲覧履歴</h2>
        <label class="check-field">
          <input v-model="historyDisabled" type="checkbox" @change="saveHistorySetting">
          閲覧履歴を無効にする
        </label>
        <ul v-if="history.length" class="result-list">
          <li v-for="bookId in history.slice(0, 10)" :key="bookId" class="result-item">
            <NuxtLink :to="{ name: 'book', params: { id: bookId } }">{{ bookId }}</NuxtLink>
          </li>
        </ul>
        <p v-else class="muted">保存済みの閲覧履歴はありません。</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
h2 {
  margin: 0;
}

.check-field {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}
</style>
