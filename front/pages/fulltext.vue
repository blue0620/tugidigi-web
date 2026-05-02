<script setup lang="ts">
definePageMeta({ name: 'fulltextsearch' });

const route = useRoute();
const router = useRouter();
const migration = useRouteMigration('fulltextsearch');
const { asStringArray, normalizeQuery } = useQueryParams();
const { $notify } = useNuxtApp();

const keyword = ref(asStringArray(route.query.keyword).join(' '));
const title = ref(String(route.query['f-title'] || ''));
const author = ref(String(route.query['f-responsibility'] || ''));
const since = ref(String(route.query['r-publishyear'] || '').split(',')[0] || '');
const until = ref(String(route.query['r-publishyear'] || '').split(',')[1] || '');
const searchfield = ref(route.query.searchfield === 'contentonly' ? 'contentonly' : '');
const withoutHighlight = ref(route.query.withouthighlight === 'true');
const withoutImage = ref(route.query.withoutimg === 'true');
const sort = ref(String(route.query.sort || ''));

const activeKeywords = computed(() => asStringArray(route.query.keyword));
const hasQuery = computed(() => activeKeywords.value.length > 0);

const search = async () => {
  const keywords = keyword.value.split(/[\s\u3000]+/).filter(Boolean);
  if (keywords.join('').length < 2) {
    $notify('2文字以上のキーワードを入力してください。', 'error');
    return;
  }

  await router.push({
    name: 'fulltextsearch',
    query: normalizeQuery({
      keyword: keywords,
      searchfield: searchfield.value,
      withoutimg: withoutImage.value ? 'true' : '',
      withouthighlight: withoutHighlight.value ? 'true' : '',
      'f-title': title.value,
      'f-responsibility': author.value,
      'r-publishyear': since.value || until.value ? `${since.value},${until.value}` : '',
      sort: sort.value,
    }),
  });
};
</script>

<template>
  <main class="page-shell">
    <div class="page-title-row">
      <div>
        <h1>全文検索</h1>
        <p class="lead">旧 FulltextSearch class component のルート画面を Nuxt3 Composition API へ移植しています。</p>
      </div>
      <MigrationStatus :status="migration.status" />
    </div>

    <form class="panel grid" @submit.prevent="search">
      <div class="field">
        <label for="keyword">キーワード</label>
        <input id="keyword" v-model="keyword" class="input" autocomplete="off">
      </div>
      <div class="grid is-two">
        <div class="field">
          <label for="title">タイトル</label>
          <input id="title" v-model="title" class="input">
        </div>
        <div class="field">
          <label for="author">著者・責任表示</label>
          <input id="author" v-model="author" class="input">
        </div>
      </div>
      <div class="grid is-two">
        <div class="field">
          <label for="since">出版年 From</label>
          <input id="since" v-model="since" class="input" inputmode="numeric">
        </div>
        <div class="field">
          <label for="until">出版年 To</label>
          <input id="until" v-model="until" class="input" inputmode="numeric">
        </div>
      </div>
      <div class="grid is-two">
        <label class="check-field">
          <input v-model="searchfield" type="checkbox" true-value="contentonly" false-value="">
          OCR 本文のみを検索
        </label>
        <label class="check-field">
          <input v-model="withoutImage" type="checkbox">
          画像なしで検索
        </label>
        <label class="check-field">
          <input v-model="withoutHighlight" type="checkbox">
          ハイライトなし
        </label>
        <div class="field">
          <label for="sort">ソート</label>
          <select id="sort" v-model="sort" class="select">
            <option value="">一致度順</option>
            <option value="publishyear:asc">出版年 昇順</option>
            <option value="publishyear:desc">出版年 降順</option>
          </select>
        </div>
      </div>
      <div class="button-row">
        <button class="button" type="submit">検索</button>
        <NuxtLink class="button is-secondary" to="/fulltext">条件をクリア</NuxtLink>
      </div>
    </form>

    <FulltextResults v-if="hasQuery" />
  </main>
</template>

<style scoped>
.check-field {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.search-state {
  margin-top: 1rem;
}

.search-state h2 {
  margin: 0 0 0.5rem;
}
</style>
