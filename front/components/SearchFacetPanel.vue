<script setup lang="ts">
import type { ItemFacet } from '~/types/domain';

const { $appRuntime } = useNuxtApp();

const props = defineProps<{
  facet: ItemFacet;
  selected?: string[];
  defaultLength?: number;
}>();

const emit = defineEmits<{
  update: [values: string[] | undefined];
}>();

const open = ref(true);
const showAll = ref(false);

const visibleLimit = computed(() => props.defaultLength || 5);
const selectedValues = computed(() => props.selected || []);

const includedValues = computed(() => selectedValues.value.filter((value) => !value.startsWith('-')));
const excludedValues = computed(() => selectedValues.value.filter((value) => value.startsWith('-')).map((value) => value.slice(1)));

const entries = computed(() =>
  Object.entries(props.facet.counts || {})
    .filter(([value]) => value && value !== 'graphic_nishikie')
    .sort((left, right) => right[1] - left[1]),
);

const visibleEntries = computed(() =>
  showAll.value ? entries.value : entries.value.slice(0, visibleLimit.value),
);

const remains = computed(() => Math.max(0, entries.value.length - visibleLimit.value));

const title = computed(() => {
  const labels: Record<string, { ja: string; en: string }> = {
    isClassic: { ja: '資料種別', en: 'Material type' },
    'graphictags.tagname': { ja: '画像種別', en: 'Image type' },
    language: { ja: '言語', en: 'Language' },
    ndc: { ja: 'NDC', en: 'NDC' },
  };

  const label = labels[props.facet.field];

  return label ? $appRuntime.t(label.ja, label.en) : props.facet.field;
});

const labelValue = (value: string) => {
  const labels: Record<string, { ja: string; en: string }> = {
    graphic: { ja: '非写真', en: 'not Photo' },
    picture: { ja: '写真', en: 'Photo' },
    graphic_illust: { ja: 'イラスト', en: 'Graphic' },
    graphic_illustcolor: { ja: 'カラーイラスト', en: 'Graphic color' },
    graphic_graph: { ja: 'グラフ', en: 'Graph' },
    graphic_map: { ja: '地図', en: 'Map' },
    picture_indoor: { ja: '屋内写真', en: 'Photo(Indoor)' },
    picture_object: { ja: '写真(美術品等)', en: 'Photo(Object)' },
    picture_person: { ja: '写真(人物)', en: 'Photo(Person)' },
    picture_outdoor: { ja: '屋外写真', en: 'Photo(Outdoor)' },
    picture_landmark: { ja: '写真(建造物等)', en: 'Photo(Landmark)' },
    stamp: { ja: '印影', en: 'Stamp' },
    true: { ja: '古典籍', en: 'Classic book' },
    false: { ja: '図書', en: 'Non-classic book' },
  };

  const label = labels[value];

  return label ? $appRuntime.t(label.ja, label.en) : value;
};

const updateValues = (values: string[]) => {
  emit('update', values.length ? values : undefined);
};

const toggleValue = (value: string) => {
  const current = [...selectedValues.value];
  const includedIndex = current.indexOf(value);
  const excludedIndex = current.indexOf(`-${value}`);

  if (includedIndex >= 0) {
    current.splice(includedIndex, 1);
  } else {
    if (excludedIndex >= 0) current.splice(excludedIndex, 1);
    current.push(value);
  }

  updateValues(current);
};

const excludeValue = (value: string) => {
  const current = [...selectedValues.value];
  const includedIndex = current.indexOf(value);
  const excludedIndex = current.indexOf(`-${value}`);

  if (excludedIndex >= 0) {
    current.splice(excludedIndex, 1);
  } else {
    if (includedIndex >= 0) current.splice(includedIndex, 1);
    current.push(`-${value}`);
  }

  updateValues(current);
};

const isIncluded = (value: string) => includedValues.value.includes(value);
const isExcluded = (value: string) => excludedValues.value.includes(value);
</script>

<template>
  <section v-if="entries.length || excludedValues.length" class="facet-panel">
    <button class="facet-header" type="button" @click="open = !open">
      <span>{{ title }}</span>
      <span>{{ open ? $appRuntime.t('隠す', 'Hide') : $appRuntime.t('表示', 'Show') }}</span>
    </button>

    <div v-if="open" class="facet-body">
      <ul class="facet-list">
        <li v-for="[value, count] in visibleEntries" :key="value" class="facet-item">
          <label class="facet-choice" :class="{ 'is-selected': isIncluded(value) }">
            <input :checked="isIncluded(value)" type="checkbox" @change="toggleValue(value)">
            <span class="facet-label">{{ labelValue(value) }}</span>
            <span class="facet-count">{{ count }}</span>
          </label>
          <button
            v-if="!isIncluded(value) || isExcluded(value)"
            class="facet-exclude"
            type="button"
            :class="{ 'is-active': isExcluded(value) }"
            @click="excludeValue(value)"
          >
            {{ $appRuntime.t('除外', 'Exclude') }}
          </button>
        </li>
      </ul>

      <ul v-if="excludedValues.length" class="excluded-list">
        <li v-for="value in excludedValues" :key="value">
          <button type="button" @click="excludeValue(value)">
            {{ labelValue(value) }} / {{ $appRuntime.t('検索結果から除外します', 'Exclude from search result') }}
          </button>
        </li>
      </ul>

      <button v-if="remains > 0" class="facet-more" type="button" @click="showAll = !showAll">
        {{ showAll ? $appRuntime.t('隠す', 'Hide') : $appRuntime.t(`残り${remains}件も表示`, `Show Remaining ${remains}`) }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.facet-panel {
  background: #ffffff;
  border: 1px solid #dbe3ed;
  border-radius: 8px;
  overflow: hidden;
}

.facet-header {
  align-items: center;
  background: #f3f7fb;
  border: 0;
  color: #1e2a38;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 0.9rem;
  width: 100%;
}

.facet-body {
  padding: 0.8rem 0.9rem 0.9rem;
}

.facet-list,
.excluded-list {
  display: grid;
  gap: 0.55rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.facet-item {
  display: grid;
  gap: 0.35rem;
}

.facet-choice {
  align-items: center;
  cursor: pointer;
  display: grid;
  gap: 0.45rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.facet-choice.is-selected {
  color: #005eb8;
  font-weight: 700;
}

.facet-label {
  line-height: 1.4;
}

.facet-count {
  color: #66788d;
  font-size: 0.85rem;
}

.facet-exclude,
.excluded-list button,
.facet-more {
  background: none;
  border: 0;
  color: #6b4e00;
  cursor: pointer;
  justify-self: start;
  padding: 0;
}

.facet-exclude.is-active {
  color: #b3261e;
  font-weight: 700;
}

.excluded-list {
  border-top: 1px solid #e5ebf2;
  margin-top: 0.8rem;
  padding-top: 0.8rem;
}

.excluded-list li {
  background: #eef2f6;
  border-radius: 6px;
  color: #53657a;
  padding: 0.45rem 0.6rem;
}

.facet-more {
  color: #005eb8;
  margin-top: 0.8rem;
}
</style>
