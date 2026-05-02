<script setup lang="ts">
import type { NdcData } from '~/src/ts/utils/ndcdata';

const props = defineProps<{
  modelValue: string[];
  ndcData: NdcData;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const openedPrimary = ref<string[]>([]);
const openedSecondary = ref<string[]>([]);

const selectedPrimary = ref<string[]>([]);
const selectedSecondary = ref<string[]>([]);
const selectedTertiary = ref<string[]>([]);
const syncing = ref(false);
const applyingExternalModel = ref(false);

const primaryLabel = (item: NdcData[number]) => `${item.key} ${item.titleEn}`;
const secondaryLabel = (item: NdcData[number]['children'][number]) => `${item.key} ${item.titleEn}`;
const tertiaryLabel = (item: NdcData[number]['children'][number]['children'][number]) => `${item.key} ${item.titleEn}`;

const parseModelValue = () => {
  selectedPrimary.value = [];
  selectedSecondary.value = [];
  selectedTertiary.value = [];

  props.modelValue.forEach((key) => {
    if (/^\d\d\d$/.test(key)) selectedTertiary.value.push(key);
    else if (/^\d\d\*$/.test(key)) selectedSecondary.value.push(`${key.slice(0, 2)}0`);
    else if (/^\d\*$/.test(key)) selectedPrimary.value.push(`${key.slice(0, 1)}00`);
  });
};

const emitQueryValue = () => {
  if (syncing.value) return;

  const values: string[] = [];
  values.push(...selectedPrimary.value.map((key) => `${key.slice(0, 1)}*`));
  values.push(
    ...selectedSecondary.value
      .filter((key) => !selectedPrimary.value.includes(`${key.slice(0, 1)}00`))
      .map((key) => `${key.slice(0, 2)}*`),
  );
  values.push(
    ...selectedTertiary.value.filter((key) => !selectedSecondary.value.includes(`${key.slice(0, 2)}0`)),
  );
  emit('update:modelValue', values);
};

const syncSecondaryFromPrimary = () => {
  props.ndcData.forEach((primary) => {
    const shouldSelect = selectedPrimary.value.includes(primary.key);
    const children = primary.children.map((child) => child.key);

    if (shouldSelect) {
      children.forEach((key) => {
        if (!selectedSecondary.value.includes(key)) selectedSecondary.value.push(key);
      });
    } else {
      selectedSecondary.value = selectedSecondary.value.filter((key) => !children.includes(key));
    }
  });
};

const syncTertiaryFromSecondary = () => {
  props.ndcData.forEach((primary) => {
    primary.children.forEach((secondary) => {
      const shouldSelect = selectedSecondary.value.includes(secondary.key);
      const children = secondary.children.map((child) => child.key);

      if (shouldSelect) {
        children.forEach((key) => {
          if (!selectedTertiary.value.includes(key)) selectedTertiary.value.push(key);
        });
      } else {
        selectedTertiary.value = selectedTertiary.value.filter((key) => !children.includes(key));
      }
    });
  });
};

const fillParentsFromChildren = () => {
  props.ndcData.forEach((primary) => {
    primary.children.forEach((secondary) => {
      const tertiaryKeys = secondary.children.map((child) => child.key);
      const allTertiarySelected = tertiaryKeys.length > 0 && tertiaryKeys.every((key) => selectedTertiary.value.includes(key));
      if (allTertiarySelected) {
        if (!selectedSecondary.value.includes(secondary.key)) selectedSecondary.value.push(secondary.key);
      } else {
        selectedSecondary.value = selectedSecondary.value.filter((key) => key !== secondary.key);
      }
    });

    const secondaryKeys = primary.children.map((child) => child.key);
    const allSecondarySelected = secondaryKeys.length > 0 && secondaryKeys.every((key) => selectedSecondary.value.includes(key));
    if (allSecondarySelected) {
      if (!selectedPrimary.value.includes(primary.key)) selectedPrimary.value.push(primary.key);
    } else {
      selectedPrimary.value = selectedPrimary.value.filter((key) => key !== primary.key);
    }
  });
};

watch(
  () => props.modelValue,
  () => {
    applyingExternalModel.value = true;
    syncing.value = true;
    parseModelValue();
    syncing.value = false;
    nextTick(() => {
      applyingExternalModel.value = false;
    });
  },
  { immediate: true },
);

watch(selectedPrimary, () => {
  if (applyingExternalModel.value) return;
  syncing.value = true;
  syncSecondaryFromPrimary();
  syncTertiaryFromSecondary();
  syncing.value = false;
  emitQueryValue();
}, { deep: true });

watch(selectedSecondary, () => {
  if (applyingExternalModel.value) return;
  syncing.value = true;
  syncTertiaryFromSecondary();
  fillParentsFromChildren();
  syncing.value = false;
  emitQueryValue();
}, { deep: true });

watch(selectedTertiary, () => {
  if (applyingExternalModel.value) return;
  syncing.value = true;
  fillParentsFromChildren();
  syncing.value = false;
  emitQueryValue();
}, { deep: true });

const hasActivePrimaryChild = (primaryKey: string) => {
  const pattern = new RegExp(`^${primaryKey.slice(0, 1)}\\d{2}$`);
  return selectedTertiary.value.some((key) => pattern.test(key));
};

const hasActiveSecondaryChild = (secondaryKey: string) => {
  const pattern = new RegExp(`^${secondaryKey.slice(0, 2)}\\d$`);
  return selectedTertiary.value.some((key) => pattern.test(key));
};

const toggleOpen = (list: Ref<string[]>, key: string) => {
  list.value = list.value.includes(key) ? list.value.filter((item) => item !== key) : [...list.value, key];
};
</script>

<template>
  <section class="ndc-filter">
    <p class="ndc-title">NDC</p>
    <div v-for="primary in ndcData" :key="primary.key" class="ndc-primary">
      <button class="ndc-header" :class="{ 'is-semi-active': hasActivePrimaryChild(primary.key) }" type="button" @click="toggleOpen(openedPrimary, primary.key)">
        <label class="ndc-check" @click.stop>
          <input v-model="selectedPrimary" type="checkbox" :value="primary.key">
          <span>{{ primaryLabel(primary) }}</span>
        </label>
        <span>{{ openedPrimary.includes(primary.key) ? '−' : '+' }}</span>
      </button>

      <div v-if="openedPrimary.includes(primary.key)" class="ndc-body">
        <div v-for="secondary in primary.children" :key="secondary.key" class="ndc-secondary">
          <button class="ndc-header is-secondary" :class="{ 'is-semi-active': hasActiveSecondaryChild(secondary.key) }" type="button" @click="toggleOpen(openedSecondary, secondary.key)">
            <label class="ndc-check" @click.stop>
              <input v-model="selectedSecondary" type="checkbox" :value="secondary.key">
              <span>{{ secondaryLabel(secondary) }}</span>
            </label>
            <span>{{ openedSecondary.includes(secondary.key) ? '−' : '+' }}</span>
          </button>

          <div v-if="openedSecondary.includes(secondary.key)" class="ndc-body tertiary-body">
            <label v-for="tertiary in secondary.children" :key="tertiary.key" class="ndc-tertiary">
              <input v-model="selectedTertiary" type="checkbox" :value="tertiary.key">
              <span>{{ tertiaryLabel(tertiary) }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ndc-filter {
  border-top: 1px solid #d8dee8;
  margin-top: 0.6rem;
  padding-top: 0.8rem;
}

.ndc-title {
  font-size: 0.92rem;
  font-weight: 700;
  margin: 0 0 0.6rem;
}

.ndc-primary,
.ndc-secondary {
  border: 1px solid #d8dee8;
  margin-top: 0.45rem;
}

.ndc-header {
  align-items: center;
  background: #fff;
  border: none;
  display: flex;
  justify-content: space-between;
  padding: 0.45rem 0.6rem;
  width: 100%;
}

.ndc-header.is-secondary {
  background: #fbfcfe;
}

.ndc-header.is-semi-active {
  background: #eef5ff;
}

.ndc-check {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  min-width: 0;
  text-align: left;
}

.ndc-check span,
.ndc-tertiary span {
  overflow-wrap: anywhere;
}

.ndc-body {
  border-top: 1px solid #d8dee8;
  padding: 0.35rem 0.45rem 0.5rem;
}

.tertiary-body {
  display: grid;
  gap: 0.35rem;
}

.ndc-tertiary {
  align-items: start;
  display: flex;
  gap: 0.45rem;
}
</style>
