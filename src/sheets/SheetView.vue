<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import { useSheetStore } from '@/stores/sheets';
import type { SheetDefinition } from '@/types';
import SheetRenderer from './SheetRenderer.vue';
import SheetLayoutEditor from './SheetLayoutEditor/SheetLayoutEditor.vue';
import SheetEditor from './SheetEditor.vue';

import { useRoute } from 'vue-router';

const route = useRoute();

interface Props {
  id?: string;
  isEditing?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  id: () => '',
});

// Use route id if prop id is not provided
const effectiveId = computed(
  () => props.id || (route.params.id as string) || '',
);

const { t } = useI18n();
const store = useSheetStore();
const activeTab = ref('information');

// Set up tabs
const tabs = computed(() => [
  { id: 'information', label: t('sheets.information') },
  { id: 'rendered', label: t('sheets.rendered') },
  { id: 'sheet-editor', label: t('sheets.editor') },
]);

const currentSheet = computed(() => {
  if (effectiveId.value) {
    return store.getById(effectiveId.value);
  }
  return null;
});

const title = computed(() => currentSheet.value?.name || t('sheets.sheet'));
const subtitle = computed(() => currentSheet.value?.system || '');

const loading = computed(() => !store.isLoaded);
const notFound = computed(
  () => effectiveId.value !== 'new' && !currentSheet.value,
);

// Watch for changes in ID prop to load new sheet if needed
watch(
  () => effectiveId.value,
  (newId) => {
    if (newId && newId !== 'new') {
      store.setCurrentId(newId);
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await store.load();
  if (effectiveId.value && effectiveId.value !== 'new') {
    store.setCurrentId(effectiveId.value);
  }
});

async function handleDelete() {
  if (currentSheet.value) {
    await store.remove(currentSheet.value.id);
  }
}

function handleSave(sheet: SheetDefinition) {
  if (sheet.id) {
    store.update(sheet.id, sheet);
  } else {
    store.create(sheet);
  }
}

// Handle updates to the sheet layout
function handleLayoutUpdate(sheet: SheetDefinition) {
  if (sheet.id) {
    store.update(sheet.id, sheet);
  }
}
</script>

<template>
  <BaseEntityTabView
    :entity="currentSheet"
    :entity-name="t('sheets.sheet')"
    :list-route="'/sheets'"
    :title="title"
    :subtitle="subtitle"
    :loading="loading"
    :not-found="notFound"
    :tabs="tabs"
    :model-value="activeTab"
    @update:model-value="activeTab = $event"
    @delete="handleDelete"
  >
    <!-- Information Tab -->
    <template #information>
      <div v-if="currentSheet" class="q-pa-md">
        <div class="q-gutter-y-md">
          <div class="text-h6">{{ currentSheet.name }}</div>
          <div v-if="currentSheet.description" class="text-body1">
            {{ currentSheet.description }}
          </div>
          <div v-if="currentSheet.system" class="text-body2 text-italic">
            System: {{ currentSheet.system }}
          </div>
          <div class="text-caption text-grey">
            Created: {{ new Date(currentSheet.createdAt).toLocaleString() }}
          </div>
          <div class="text-caption text-grey">
            Updated: {{ new Date(currentSheet.updatedAt).toLocaleString() }}
          </div>
        </div>
      </div>
    </template>

    <!-- Rendered Sheet Tab -->
    <template #rendered>
      <div class="q-pa-md">
        <SheetRenderer
          v-if="currentSheet"
          :sheet="currentSheet"
          class="rendered-sheet"
        />
        <div v-else class="text-center text-grey q-pa-xl">
          {{ t('sheets.noLayout') }}
        </div>
      </div>
    </template>

    <!-- Sheet Editor Tab for layout editing -->
    <template #sheet-editor>
      <div class="q-pa-md">
        <SheetLayoutEditor
          v-if="currentSheet"
          :model-value="currentSheet"
          @update:model-value="handleLayoutUpdate"
        />
        <div v-else class="text-center text-grey q-pa-xl">
          {{ t('sheets.noLayout') }}
        </div>
      </div>
    </template>

    <!-- Editor Modal/Panel -->
    <template #editor>
      <SheetEditor
        :sheet="currentSheet"
        :is-open="false"
        @submit="handleSave"
      />
    </template>
  </BaseEntityTabView>
</template>

<style scoped>
.rendered-sheet {
  width: 100%;
}
</style>
