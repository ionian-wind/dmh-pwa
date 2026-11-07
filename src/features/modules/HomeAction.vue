<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useModuleStore } from '@/stores/modules';
import { useNoteStore } from '@/stores/notes';
import {
  importModuleFromZip,
  parseModuleZip,
} from '@/utils/moduleImportExport';
import { deepUnwrap } from '@/utils/deepUnwrap';
import { alert } from '@/dialogs';

const { t } = useI18n();
const moduleStore = useModuleStore();
const noteStore = useNoteStore();

async function handleModuleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  try {
    const { module, tree, notes } = await parseModuleZip(file);
    const result = await importModuleFromZip(
      deepUnwrap({ module, tree, notes }),
    );
    await alert(
      t('backup.moduleImported') + ` ${result.noteCount} notes imported.`,
    );
    await Promise.all([moduleStore.load(), noteStore.load()]);
  } catch (error) {
    await alert(
      t('backup.moduleImportFailed') +
        (error instanceof Error ? error.message : error),
    );
  }
  input.value = '';
}

defineExpose({ handleModuleImport });
</script>

<template>
  <QBtn color="positive" :label="t('backup.importModule')">
    <input
      type="file"
      accept=".zip"
      style="
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
      "
      @change="handleModuleImport"
    />
  </QBtn>
</template>
