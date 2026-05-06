<script setup lang="ts">
import HistoryPanel from '~/components/mypage/HistoryPanel.vue';
import TaggedBooksPanel from '~/components/mypage/TaggedBooksPanel.vue';
import {
  checkHistoryPermission,
  isViewedBookHistoryDisabled,
  retreiveFulltextDefaultSort,
  setFulltextDefaultSort,
  setHistoryPermission,
  setIsViewedBookHistoryDisabled,
  tryLocalStorageAvailable,
} from '~/utils/mypage-storage';

definePageMeta({ name: 'mypage' });

const { $notify } = useNuxtApp();

const fulltextSortOrder = ref('');
const isLocalStorageAvailable = ref(true);
const viewedBookHistoryDisabled = ref(true);

const historyValue = computed({
  get: () => (viewedBookHistoryDisabled.value ? 'true' : 'false'),
  set: (value: string) => {
    viewedBookHistoryDisabled.value = value === 'true';
  },
});

const switchHistory = (toDisabled: boolean) => {
  const result = setIsViewedBookHistoryDisabled(toDisabled);
  viewedBookHistoryDisabled.value = toDisabled;
  if (result) {
    $notify('閲覧履歴設定を保存しました。', 'success');
  }
};

const handleHistoryChange = (value: string) => {
  const toDisabled = value === 'true';

  if (toDisabled) {
    const confirmed = window.confirm('無効にするとこれまで履歴がすべてリセットされます。');
    if (!confirmed) {
      historyValue.value = 'false';
      return;
    }
    switchHistory(true);
    return;
  }

  if (!checkHistoryPermission()) {
    const confirmed = window.confirm(
      '閲覧履歴はWebブラウザのローカルストレージに保存されます。共有PCでは、他の利用者にも履歴が表示されますので、その点をご理解のうえ使用してください。',
    );
    if (!confirmed) {
      historyValue.value = 'true';
      return;
    }
    setHistoryPermission();
  }

  switchHistory(false);
};

watch(fulltextSortOrder, (current) => {
  setFulltextDefaultSort(current);
});

onMounted(() => {
  isLocalStorageAvailable.value = tryLocalStorageAvailable();
  if (!isLocalStorageAvailable.value) return;

  fulltextSortOrder.value = retreiveFulltextDefaultSort();
  viewedBookHistoryDisabled.value = checkHistoryPermission() ? isViewedBookHistoryDisabled() : true;
});
</script>

<template>
  <main class="mypage">
    <div class="container">
      <section class="hero">
        <div class="hero-body">
          <h1>マイページ</h1>
          <p>設定値や履歴はすべてブラウザに保存されます。</p>
        </div>
      </section>

      <section class="section setting">
        <p v-if="!isLocalStorageAvailable" class="notice">
          このブラウザでは個人設定が使用できません。Localstorage機能を有効にしてください
        </p>
        <template v-else>
          <h2>全文検索並び順の選び方</h2>
          <p class="setting-copy">「全文から検索」したときのデフォルトのソート順を設定します。</p>
          <div class="select-row">
            <select v-model="fulltextSortOrder" class="select">
              <option value="">関連度順</option>
              <option value="publishyear:asc">出版年昇順</option>
              <option value="publishyear:desc">出版年降順</option>
            </select>
          </div>
        </template>
      </section>

      <section id="tagged-books" class="section tagged-book">
        <h2>タグごとに一覧を表示</h2>
        <TaggedBooksPanel />
      </section>

      <section id="viewed-book-history" class="section history">
        <h2>閲覧履歴</h2>
        <p class="setting-copy">閲覧順に最新100件を保存しています。</p>
        <div class="history-setting">
          <label for="history-setting">閲覧履歴設定</label>
          <p class="setting-note">無効にするとこれまで履歴がすべてリセットされます。</p>
          <select id="history-setting" v-model="historyValue" class="select" @change="handleHistoryChange(historyValue)">
            <option value="false">有効</option>
            <option value="true">無効</option>
          </select>
        </div>
        <HistoryPanel :key="historyValue" />
      </section>
    </div>
  </main>
</template>

<style scoped>
.mypage {
  padding-bottom: 2rem;
}

.container {
  margin: 0 auto;
  max-width: 1100px;
  padding: 0 1rem;
}

.hero {
  margin-bottom: 1rem;
}

.hero-body {
  padding: 1.5rem 0 0.5rem;
}

.hero-body h1 {
  font-size: 1.9rem;
  margin: 0 0 0.4rem;
}

.hero-body p {
  color: #475569;
  margin: 0;
}

.section {
  margin-top: 1.2rem;
}

.section h2 {
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
}

.setting-copy,
.setting-note,
.notice {
  color: #475569;
}

.setting-copy {
  margin: 0 0 0.7rem;
}

.select-row,
.history-setting {
  background: #fff;
  padding: 1rem;
}

.history-setting {
  margin-bottom: 1rem;
}

.history-setting label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.setting-note {
  margin: 0 0 0.55rem;
}

.select {
  border: 1px solid #cbd5e1;
  font: inherit;
  min-height: 2.5rem;
  min-width: 14rem;
  padding: 0.45rem 2rem 0.45rem 0.7rem;
}
</style>
