<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import BaseListView from '@/components/common/BaseListView.vue';
import ModuleCard from '@/components/ModuleCard.vue';
import ModuleEditor from '@/components/ModuleEditor.vue';
import type { Module } from '@/types';
import { useI18n } from 'vue-i18n';
import ImportValidationModal from '@/components/ImportValidationModal.vue';
import { parseModuleZip, importModuleFromZip, validateModuleImport, type ImportValidationResult } from '@/utils/moduleImportExport';
import { deepUnwrap } from '@/utils/deepUnwrap';
import { IconUpload } from '@tabler/icons-vue';

const router = useRouter();
const moduleStore = useModuleStore();
const { t } = useI18n();

const showValidationModal = ref(false);
const validationResult = ref<ImportValidationResult | null>(null);
const pendingImportData = ref<{
  file: File;
  module: any;
  tree: any[];
  notes: any[];
} | null>(null);

onMounted(async () => {
  await moduleStore.load();
});

function cardProps(module: Module) {
  return {
    module,
    onView: () => router.push(`/modules/${module.id}`),
    onEdit: () => handleEdit(module),
    onDelete: () => handleDelete(module)
  };
}

function editorProps(module: Module | null) {
  return {
    module,
    isOpen: true
  };
}

function handleEdit(module: Module) {
  // handled by BaseListView
}

function handleDelete(module: Module) {
  if (confirm(`Are you sure you want to delete ${module.name}?`)) {
    moduleStore.remove(module.id);
  }
}

async function handleCopy(module: Module) {
  const { id, createdAt, updatedAt, ...rest } = module;
  await moduleStore.create(rest);
}

function handleSubmit(module: Module) {
  if (module.id) {
    moduleStore.update(module.id, module);
  } else {
    moduleStore.create(module);
  }
}

async function handleModuleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    const { module, tree, notes } = await parseModuleZip(file);
    const result = validateModuleImport(module, tree, notes);
    pendingImportData.value = { file, module, tree, notes };
    validationResult.value = result;
    showValidationModal.value = true;
  } catch (e) {
    alert(t('backup.moduleImportFailed') + (e instanceof Error ? e.message : e));
  }
  input.value = '';
}

async function handleImportConfirm() {
  if (!pendingImportData.value) return;
  try {
    const result = await importModuleFromZip(deepUnwrap(pendingImportData));
    alert(t('backup.moduleImported') + ` ${result.noteCount} notes imported.`);
    await moduleStore.load();
  } catch (e) {
    alert(t('backup.moduleImportFailed') + (e instanceof Error ? e.message : e));
  }
  showValidationModal.value = false;
  validationResult.value = null;
  pendingImportData.value = null;
}

function handleImportCancel() {
  showValidationModal.value = false;
  validationResult.value = null;
  pendingImportData.value = null;
}
</script>

<template>
  <div>
    <BaseListView
      :items="moduleStore.items"
      :card-component="ModuleCard"
      :editor-component="ModuleEditor"
      :empty-message="t('common.emptyModules')"
      :create-title="t('modules.create')"
      :card-props="cardProps"
      :editor-props="editorProps"
      @delete="handleDelete"
      @submit="handleSubmit"
      @view="(module) => router.push(`/modules/${module.id}`)"
      @copy="handleCopy"
    >
      <template #actions>
        <label class="btn btn--success btn--medium import-module" :title="t('backup.importModule')">
          <IconUpload />
          <input type="file" accept=".zip" @change="handleModuleImport" style="display:none" />
        </label>
      </template>
    </BaseListView>
    <ImportValidationModal
      v-if="showValidationModal && validationResult"
      :result="validationResult"
      @import="handleImportConfirm"
      @cancel="handleImportCancel"
    />
  </div>
</template>

<style scoped>
.import-module {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin-left: 0.5rem;
}
.import-module input[type="file"] {
  display: none;
}
</style>


