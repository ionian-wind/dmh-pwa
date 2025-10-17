<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSheetStore } from '@/sheets/stores/sheets';
import BaseListView from '@/components/common/BaseListView.vue';
import SheetCard from '@/sheets/SheetCard.vue';
import SheetEditor from '@/sheets/SheetEditor.vue';
import type { Sheet } from '@/sheets/types/sheet.types';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';

const sheetStore = useSheetStore();
const router = useRouter();
const { t } = useI18n();

onMounted(async () => {
  await sheetStore.load();
});

function cardProps(sheet: Sheet) {
  return {
    sheet,
    onView: () => router.push(`/sheets/${sheet.id}`),
    onEdit: () => handleEdit(sheet),
    onDelete: () => handleDelete(sheet),
  };
}

function editorProps(sheet: Sheet | null) {
  return {
    sheet,
    isOpen: true,
  };
}

function handleEdit(sheet: Sheet) {
  // handled by BaseListView
}

async function handleDelete(sheet: Sheet) {
  if (
    sheet.id &&
    (await confirm(t('common.confirmDelete', { title: sheet.name })))
  ) {
    await sheetStore.remove(sheet.id);
    return true;
  }
  return false;
}

function handleSubmit(sheet: Sheet) {
  if (sheet.id) {
    sheetStore.update(sheet.id, sheet);
  } else {
    sheetStore.create(sheet);
  }
}

async function handleCopy(sheet: Sheet) {
  const { id, createdAt, updatedAt, ...rest } = sheet;
  await sheetStore.create(rest);
}
</script>

<template>
  <BaseListView
    :items="sheetStore.filtered"
    :card-component="SheetCard"
    :editor-component="SheetEditor"
    :empty-message="t('common.emptySheets')"
    :create-title="t('sheets.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @submit="handleSubmit"
    @copy="handleCopy"
  />
</template>
