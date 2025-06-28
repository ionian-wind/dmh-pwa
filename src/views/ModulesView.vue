<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import BaseListView from '@/components/common/BaseListView.vue';
import ModuleCard from '@/components/ModuleCard.vue';
import ModuleEditor from '@/components/ModuleEditor.vue';
import type { Module } from '@/types';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const moduleStore = useModuleStore();
const { t } = useI18n();

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
</script>

<template>
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
  />
</template>

