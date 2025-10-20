<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseListView from '@/components/common/BaseListView.vue';
import SheetCard from './SheetCard.vue';
import SheetEditor from './SheetEditor.vue';
import { useSheetStore } from '@/stores/sheets';
import { confirm } from '@/dialogs';
import type { SheetDefinition } from '@/types';

const store = useSheetStore();
const router = useRouter();
const { t } = useI18n();

onMounted(async () => {
  await store.load();
});

function cardProps(sheet: SheetDefinition) {
  return {
    sheet,
    onView: () => router.push(`/sheets/${sheet.id}`),
    onEdit: () => handleEdit(sheet),
    onDelete: () => handleDelete(sheet),
  };
}

function editorProps(sheet: SheetDefinition | null) {
  return {
    sheet,
    isOpen: true,
  };
}

function handleEdit(sheet: SheetDefinition) {
  // handled by BaseListView
}

async function handleDelete(sheet: SheetDefinition) {
  if (
    sheet.id &&
    await confirm(t('common.confirmDelete', { title: sheet.name }))
  ) {
    await store.remove(sheet.id);
    return true;
  }
  return false;
}

function handleSubmit(sheet: SheetDefinition) {
  if (sheet.id && store.getById(sheet.id)) {
    store.update(sheet.id, sheet);
  } else {
    store.create(sheet);
  }
}

async function handleCopy(sheet: SheetDefinition) {
  const { id, createdAt, updatedAt, ...rest } = sheet;
  await store.create(rest);
}
</script>

<template>
  <BaseListView
    :items="store.filtered"
    :card-component="SheetCard"
    :editor-component="SheetEditor"
    :empty-message="t('sheets.empty')"
    :create-title="t('sheets.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @submit="handleSubmit"
    @copy="handleCopy"
  />
</template>

<style scoped>
.base-list-container {
  min-height: 100%;
}
</style>