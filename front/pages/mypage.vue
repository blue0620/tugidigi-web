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

const { $notify, $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

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
    $notify(t('閲覧履歴設定を保存しました。', 'Saved viewing history setting.'), 'success');
  }
};

const handleHistoryChange = (value: string) => {
  const toDisabled = value === 'true';

  if (toDisabled) {
    const confirmed = window.confirm(t('無効にするとこれまで履歴がすべてリセットされます。', 'Disabling this will reset your viewing history.'));
    if (!confirmed) {
      historyValue.value = 'false';
      return;
    }
    switchHistory(true);
    return;
  }

  if (!checkHistoryPermission()) {
    const confirmed = window.confirm(
      t('閲覧履歴はWebブラウザのローカルストレージに保存されます。共有PCでは、他の利用者にも履歴が表示されますので、その点をご理解のうえ使用してください。', 'Viewing history is stored in your web browser local storage. On a shared PC, it may also be visible to other users. Please use it with that understanding.'),
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
          <h1>{{ t('マイページ', 'My Page') }}</h1>
          <p>{{ t('設定値や履歴はすべてブラウザに保存されます。', 'Settings and history are stored in your browser.') }}</p>
        </div>
      </section>

      <section class="section setting">
        <p v-if="!isLocalStorageAvailable" class="notice">
          {{ t('このブラウザでは個人設定が使用できません。Localstorage機能を有効にしてください', 'Personal settings are not available in this browser. Please enable localStorage.') }}
        </p>
        <template v-else>
          <h2>{{ t('全文検索並び順の選び方', 'Default full-text sort order') }}</h2>
          <p class="setting-copy">{{ t('「全文から検索」したときのデフォルトのソート順を設定します。', 'Set the default sort order for keyword search.') }}</p>
          <div class="select-row">
            <select v-model="fulltextSortOrder" class="select">
              <option value="">{{ t('関連度順', 'Relevance') }}</option>
              <option value="publishyear:asc">{{ t('出版年昇順', 'Published year ascending') }}</option>
              <option value="publishyear:desc">{{ t('出版年降順', 'Published year descending') }}</option>
            </select>
          </div>
        </template>
      </section>

      <section id="tagged-books" class="section tagged-book">
        <h2>{{ t('タグごとに一覧を表示', 'Browse by tag') }}</h2>
        <TaggedBooksPanel />
      </section>

      <section id="viewed-book-history" class="section history">
        <h2>{{ t('閲覧履歴', 'Viewing history') }}</h2>
        <p class="setting-copy">{{ t('閲覧順に最新100件を保存しています。', 'The latest 100 viewed materials are stored in order.') }}</p>
        <div class="history-setting">
          <label for="history-setting">{{ t('閲覧履歴設定', 'Viewing history setting') }}</label>
          <p class="setting-note">{{ t('無効にするとこれまで履歴がすべてリセットされます。', 'Disabling this will reset your viewing history.') }}</p>
          <select id="history-setting" v-model="historyValue" class="select" @change="handleHistoryChange(historyValue)">
            <option value="false">{{ t('有効', 'Enabled') }}</option>
            <option value="true">{{ t('無効', 'Disabled') }}</option>
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
