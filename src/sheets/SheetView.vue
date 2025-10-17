<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSheetStore } from '@/sheets/stores/sheets';
import SheetEditor from '@/sheets/SheetEditor.vue';
import SheetVisualEditor from '@/sheets/SheetVisualEditor.vue';
import SheetRenderer from '@/sheets/SheetRenderer.vue';
import type { Sheet } from '@/sheets/types/sheet.types';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import Mentions from '@/components/common/Mentions.vue';
import { useMentionsStore } from '@/utils/storage';
import { useI18n } from 'vue-i18n';

const router = useRouter();

const route = useRoute();
const sheetStore = useSheetStore();
const mentionsStore = useMentionsStore();
const { t } = useI18n();
const showEditor = ref(false);
const activeTab = ref('information');

const isLoaded = computed(() => sheetStore.isLoaded);
const sheet = computed(() => sheetStore.getById(route.params.id as string));
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !sheet.value);

const entityTabs = [
  { id: 'information', label: t('sheets.tabs.information') },
  { id: 'layout', label: t('sheets.tabs.layout') },
  { id: 'visual', label: t('sheets.tabs.editor') },
];

function editSheet() {
  showEditor.value = true;
}

async function handleDelete() {
  if (sheet.value) {
    await sheetStore.remove(sheet.value.id);
    await router.push('/sheets');
  }
}

function handleSave(updated: Sheet) {
  if (sheet.value) {
    sheetStore.update(sheet.value.id, updated);
    sheetStore.getById(sheet.value.id);
  }
  showEditor.value = false;
}

function closeEditor() {
  showEditor.value = false;
}

function handleLayoutUpdate(updatedSheet: Sheet) {
  if (sheet.value) {
    sheetStore.update(sheet.value.id, updatedSheet);
  }
}

// Computed properties for BaseEntityView
const sheetTitle = computed(() => sheet.value?.name || '');

const mentionedEntities = computed(() => {
  if (!sheet.value) return [];
  return mentionsStore.getLinks({ kind: 'sheet', id: sheet.value.id });
});
const mentionedInEntities = computed(() => {
  if (!sheet.value) return [];
  return mentionsStore.getBacklinks({
    kind: 'sheet',
    id: sheet.value.id,
  });
});

onMounted(async () => {
  await sheetStore.load();
  await mentionsStore.load();

  // Check if we should open the visual editor automatically
  if (route.query.visualEditor === 'true') {
    // Switch to the visual tab instead of opening a modal
    activeTab.value = 'visual';
  }
});

// Watch for route changes and switch to appropriate tab
watch(
  () => route.query.visualEditor,
  (newVal) => {
    if (newVal === 'true') {
      activeTab.value = 'visual';
    } else if (activeTab.value === 'visual') {
      // If we're leaving the visual editor, switch to information tab
      activeTab.value = 'information';
    }
  },
);
</script>

<template>
  <BaseEntityTabView
    :entity="sheet"
    :entity-name="t('sheets.title')"
    list-route="/sheets"
    :on-delete="handleDelete"
    :on-edit="editSheet"
    :is-editing="showEditor"
    :title="sheetTitle"
    :not-found="notFound"
    :loading="loading"
    :tabs="entityTabs"
    v-model="activeTab"
  >
    <template #information>
      <div v-if="sheet" class="q-pa-md q-gutter-md">
        <div v-if="sheet.notes" class="q-mb-md">
          <h2>{{ t('notes.title') }}</h2>
          <div class="q-pa-sm bg-grey-1 rounded-borders">
            <p>{{ sheet.notes }}</p>
          </div>
        </div>
      </div>
    </template>

    <template #layout>
      <div v-if="sheet" class="q-pa-md q-gutter-md">
        <div class="q-pa-sm bg-grey-1 rounded-borders">
          <SheetRenderer v-if="sheet" :sheet="sheet" :readonly="true" />
        </div>
      </div>
    </template>

    <template #visual>
      <SheetVisualEditor
        v-if="sheet"
        :sheet="sheet"
        @update:sheet="handleLayoutUpdate"
      />
    </template>

    <!-- Sheet Editor Modal -->
    <template #editor>
      <SheetEditor
        :isOpen="showEditor"
        :sheet="sheet"
        @submit="handleSave"
        @cancel="closeEditor"
      />
    </template>

    <template #sidepanel>
      <Mentions :title="t('common.mentions')" :entities="mentionedEntities" />
      <Mentions
        :title="t('common.mentionedIn')"
        :entities="mentionedInEntities"
      />
    </template>
  </BaseEntityTabView>
</template>

<style scoped>
/* Use Quasar classes for styling */
</style>
