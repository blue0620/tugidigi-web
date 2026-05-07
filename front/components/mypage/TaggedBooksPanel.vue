<script setup lang="ts">
import type { Book, Illustration } from '~/types/domain';
import {
  addTagObject,
  deleteTagObject,
  renameTagName,
  retrieveAllTagNames,
  retrieveObjectByTagName,
} from '~/utils/mypage-indexeddb';
import { tryLocalStorageAvailable } from '~/utils/mypage-storage';
const { $appRuntime } = useNuxtApp();
const t = (ja: string, en: string) => $appRuntime.t(ja, en);

const route = useRoute();
const router = useRouter();
const { normalizeQuery } = useQueryParams();
const { searchBooks, getIllustrationsByIds, getIllustrationsByBook } = useSearchApi();

const taggedBookIds = ref<string[]>([]);
const allTagNames = ref<string[]>([]);
const result = ref<{ list: Book[]; hit: number } | null>(null);
const isLocalStorageAvailable = ref(true);
const isExportModalActive = ref(false);
const isImportModalActive = ref(false);
const dataToImport = ref('');
const tagNameToImport = ref('');
const exportCSV = ref('');
const keywordBuffer = ref('');
const loading = ref(false);

const keyword = computed(() => {
  const value = route.query.tag_keyword;
  return Array.isArray(value) ? (value[0] || '') : typeof value === 'string' ? value : '';
});

const currentPage = computed(() => {
  const value = Number(Array.isArray(route.query.viewed_book_page) ? route.query.viewed_book_page[0] : route.query.viewed_book_page || 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
});

const currentTagName = computed(() => {
  const value = route.query.current_tag_name;
  if (Array.isArray(value)) return value[0] || allTagNames.value[0] || '';
  if (typeof value === 'string' && value) return value;
  return allTagNames.value[0] || '';
});

const pageSize = 5;
const pageFrom = computed(() => (currentPage.value - 1) * pageSize);
const sortedBookList = computed(
  () =>
    taggedBookIds.value
      .map((id) => result.value?.list.find((book) => book.id === id))
      .filter((book): book is Book => Boolean(book)),
);
const querySignature = computed(() => JSON.stringify({
  current_tag_name: route.query.current_tag_name || '',
  tag_keyword: route.query.tag_keyword || '',
  viewed_book_page: route.query.viewed_book_page || '',
}));

const loadIllustrations = async (books: Book[]) => {
  await Promise.all(
    books.map(async (book) => {
      try {
        book.illusts = book.illustrations?.length
          ? await getIllustrationsByIds(book.illustrations)
          : await getIllustrationsByBook(book.id);
      } catch {
        book.illusts = [];
      }
    }),
  );
};

const reloadTagNames = async () => {
  allTagNames.value = await retrieveAllTagNames();
};

const reloadTaggedBooks = async () => {
  isLocalStorageAvailable.value = tryLocalStorageAvailable();
  if (!isLocalStorageAvailable.value) return;

  await reloadTagNames();
  keywordBuffer.value = keyword.value;

  if (!currentTagName.value) {
    taggedBookIds.value = [];
    result.value = { list: [], hit: 0 };
    return;
  }

  const tag = await retrieveObjectByTagName(currentTagName.value);
  taggedBookIds.value = tag?.bookIds || [];

  if (!taggedBookIds.value.length) {
    result.value = { list: [], hit: 0 };
    return;
  }

  const query: Record<string, string | string[]> = {
    'f-id': taggedBookIds.value,
    from: String(pageFrom.value),
    size: String(pageSize),
  };

  if (keyword.value.length > 1) {
    query.keyword = keyword.value.split(/[\s　]+/).filter(Boolean);
  }

  loading.value = true;
  try {
    const response = await searchBooks({}, query);
    await loadIllustrations(response.list || []);
    result.value = response;
  } finally {
    loading.value = false;
  }
};

const updateQuery = async (updates: Record<string, string | number | undefined>) => {
  const nextQuery = normalizeQuery({
    ...route.query,
    ...updates,
  });

  await router.replace({
    path: route.path,
    query: nextQuery,
    hash: '#tagged-books',
  });

  if (querySignature.value === JSON.stringify({
    current_tag_name: nextQuery.current_tag_name || '',
    tag_keyword: nextQuery.tag_keyword || '',
    viewed_book_page: nextQuery.viewed_book_page || '',
  })) {
    await reloadTaggedBooks();
  }
};

const changeCurrentTag = async (newTagName: string) => {
  if (!newTagName || currentTagName.value === newTagName) return;
  await updateQuery({
    viewed_book_page: '1',
    current_tag_name: newTagName,
    tag_keyword: undefined,
  });
};

const submitKeywordSearch = async () => {
  await updateQuery({
    viewed_book_page: '1',
    current_tag_name: currentTagName.value,
    tag_keyword: keywordBuffer.value || undefined,
  });
};

const changeCurrentTagName = async () => {
  const newTagName = window.prompt(t('新しいタグ名を入力してください', 'Enter a new tag name'), currentTagName.value);
  if (!newTagName) return;

  const renamed = await renameTagName(currentTagName.value, newTagName);
  if (!renamed) return;

  await reloadTagNames();
  await changeCurrentTag(newTagName);
};

const deleteCurrentTag = async () => {
  const tag = await retrieveObjectByTagName(currentTagName.value);
  if (!tag) return;

  const confirmation = window.confirm(
    `${tag.bookIds.length}件の資料が紐付けられている「${tag.tagName}」タグを削除しますか？`,
  );
  if (!confirmation) return;

  await deleteTagObject(tag);
  await reloadTagNames();
  if (allTagNames.value[0]) {
    await changeCurrentTag(allTagNames.value[0]);
    return;
  }
  taggedBookIds.value = [];
  result.value = { list: [], hit: 0 };
};

const exportCurrentTag = async () => {
  const tag = await retrieveObjectByTagName(currentTagName.value);
  if (!tag) return;

  exportCSV.value = tag.bookIds.join(',');
  isExportModalActive.value = true;
};

const importTag = async () => {
  if (!dataToImport.value || !tagNameToImport.value) {
    window.alert(t('タグ名とタグデータは必須です。', 'Tag name and tag data are required.'));
    return;
  }

  const bookIds = dataToImport.value.split(',').map((id) => id.trim()).filter(Boolean);
  const bookIdValidation = /^\d{6,}$/;
  const invalidBookIds = bookIds.filter((id) => !bookIdValidation.test(id));
  if (invalidBookIds.length) {
    window.alert(`${invalidBookIds.length}件の不正なデータが存在します\n${invalidBookIds.join(', ')}`);
    return;
  }

  const targetTagName = tagNameToImport.value;
  const ok = await addTagObject({
    tagName: targetTagName,
    bookIds,
  }).then(() => true).catch(() => false);

  window.alert(ok ? 'タグのインポートに成功しました' : 'タグのインポートに失敗しました');
  if (!ok) return;

  dataToImport.value = '';
  tagNameToImport.value = '';
  isImportModalActive.value = false;
  await reloadTagNames();
  await changeCurrentTag(targetTagName);
};

const openIllustrationSearch = async (illustration: Illustration) => {
  await navigateTo({
    name: 'illustsearchres',
    query: { image: illustration.id },
  });
};

watch(
  () => querySignature.value,
  async () => {
    await reloadTaggedBooks();
  },
  { immediate: true },
);
</script>

<template>
  <div class="tag-content">
    <div v-if="!isLocalStorageAvailable" class="search-result-body">
      <p>{{ t('このブラウザではタグ付け機能が利用できません。Localstorage機能を有効にしてください', 'Tagging is not available in this browser. Please enable localStorage.') }}</p>
    </div>
    <template v-else>
      <div class="management-block">
        <label class="field-label">{{ t('タグを管理する', 'Manage tags') }}</label>
        <div class="tag-menu">
          <button class="menu-button success" type="button" @click="changeCurrentTagName">{{ t('選択中のタグの名前を変更する', 'Rename selected tag') }}</button>
          <button class="menu-button danger" type="button" @click="deleteCurrentTag">{{ t('選択中のタグを削除する', 'Delete selected tag') }}</button>
          <button class="menu-button primary" type="button" @click="exportCurrentTag">{{ t('エクスポートする', 'Export') }}</button>
          <button class="menu-button" type="button" @click="isImportModalActive = true">{{ t('インポートする', 'Import') }}</button>
        </div>
      </div>

      <form class="text-search-form" @submit.prevent="submitKeywordSearch">
        <label class="field-label">選択したタグの資料を全文検索する（スニペット表示には対応していません）</label>
        <div class="search-row">
          <input
            v-model="keywordBuffer"
            class="search-input"
            type="text"
            :placeholder="t('複数語句は空白区切りで入力してください', 'Separate multiple keywords with spaces')"
          >
          <button class="search-button" type="submit">
            <span class="mdi mdi-magnify" aria-hidden="true"></span>
          </button>
        </div>
      </form>

      <div class="tag-select">
        <button
          v-for="tagName in allTagNames"
          :key="tagName"
          class="tag-chip"
          :class="{ active: tagName === currentTagName }"
          type="button"
          @click="changeCurrentTag(tagName)"
        >
          {{ tagName }}
        </button>
      </div>

      <div v-if="!taggedBookIds.length" class="search-result-body">
        <p><NuxtLink to="/fulltext">{{ t('こちらのページ', 'this page') }}</NuxtLink>{{ t('から資料を検索できます', ' to search for materials') }}</p>
      </div>
      <div v-else-if="!loading && !sortedBookList.length" class="search-result-body">
        <p>{{ t('検索する資料がありませんでした', 'No materials were found to search.') }}</p>
      </div>
      <div v-else class="search-result-body">
        <p v-if="loading" class="status-text">{{ t('読み込み中...', 'Loading...') }}</p>
        <div v-else class="book-list">
          <BookResultCard
            v-for="book in sortedBookList"
            :key="book.id"
            :book="book"
            :show-illustrations="true"
            @search-illustration="openIllustrationSearch"
          />
        </div>
      </div>

      <SearchPagination
        v-if="(result?.hit || 0) > pageSize"
        :total="result?.hit || 0"
        :from="pageFrom"
        :size="pageSize"
        @change="updateQuery({ viewed_book_page: Math.floor($event / pageSize) + 1, current_tag_name: currentTagName, tag_keyword: keyword || undefined })"
      />

      <div v-if="isExportModalActive" class="modal-shell" @click.self="isExportModalActive = false">
        <div class="modal-card">
          <h3>{{ t('CSV 形式でエクスポート', 'Export as CSV') }}</h3>
          <p>下記のデータをコピーすることで、インポートしたいブラウザのインポートボタンからこのタグに紐づいた資料の一覧をインポート可能です。</p>
          <p class="csv-box">{{ exportCSV }}</p>
          <div class="modal-actions">
            <button class="menu-button" type="button" @click="isExportModalActive = false">{{ t('閉じる', 'Close') }}</button>
          </div>
        </div>
      </div>

      <div v-if="isImportModalActive" class="modal-shell" @click.self="isImportModalActive = false">
        <div class="modal-card">
          <h3>{{ t('CSV 形式でインポート', 'Import as CSV') }}</h3>
          <label class="modal-label">
            {{ t('タグ名', 'Tag name') }}
            <input v-model="tagNameToImport" class="search-input" type="text" :placeholder="t('お好きに入れて', 'Enter any name')" >
          </label>
          <label class="modal-label">
            {{ t('タグデータ（CSV形式）', 'Tag data (CSV)') }}
            <textarea v-model="dataToImport" class="search-input textarea" placeholder="969145,969142,1879454,969144"></textarea>
          </label>
          <div class="modal-actions">
            <button class="menu-button primary" type="button" @click="importTag">{{ t('インポート', 'Import') }}</button>
            <button class="menu-button" type="button" @click="isImportModalActive = false">{{ t('閉じる', 'Close') }}</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.search-result-body {
  background: #fff;
  padding: 2rem;
}

.management-block,
.text-search-form {
  margin-bottom: 1.25rem;
}

.field-label {
  color: #334155;
  display: block;
  font-size: 0.95rem;
  margin-bottom: 0.55rem;
}

.tag-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.menu-button {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #334155;
  cursor: pointer;
  font: inherit;
  min-height: 2.35rem;
  padding: 0.5rem 0.85rem;
}

.menu-button.success {
  border-color: #16a34a;
  color: #166534;
}

.menu-button.danger {
  border-color: #dc2626;
  color: #991b1b;
}

.menu-button.primary {
  border-color: #2563eb;
  color: #1d4ed8;
}

.search-row {
  display: flex;
  gap: 0.4rem;
}

.search-input {
  border: 1px solid #cbd5e1;
  flex: 1 1 auto;
  font: inherit;
  min-height: 2.5rem;
  padding: 0.55rem 0.75rem;
}

.textarea {
  min-height: 8rem;
  resize: vertical;
}

.search-button {
  align-items: center;
  background: #0f766e;
  border: 1px solid #0f766e;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  min-height: 2.5rem;
  min-width: 2.75rem;
}

.tag-select {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 1rem;
}

.tag-chip {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  padding: 0.4rem 0.9rem;
}

.tag-chip.active {
  border-color: #0f766e;
  box-shadow: inset 0 0 0 1px #0f766e;
}

.status-text {
  margin: 0;
}

.book-list {
  display: grid;
  gap: 1.5rem;
}

.modal-shell {
  align-items: center;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 1rem;
  position: fixed;
  z-index: 50;
}

.modal-card {
  background: #fff;
  max-width: 42rem;
  padding: 1.25rem;
  width: min(100%, 42rem);
}

.modal-card h3 {
  font-size: 1.1rem;
  margin: 0 0 0.75rem;
}

.modal-label {
  color: #334155;
  display: grid;
  gap: 0.35rem;
  margin-top: 0.8rem;
}

.csv-box {
  border: 1px solid #0f172a;
  margin: 0.8rem 0 0;
  overflow-wrap: anywhere;
  padding: 0.7rem;
}

.modal-actions {
  display: flex;
  gap: 0.55rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>
