<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import type { Module } from '@/types';
import ModuleEditor from '@/components/ModuleEditor.vue';
import ModuleCard from '@/components/ModuleCard.vue';
import Button from '@/components/common/Button.vue';

const router = useRouter();
const moduleStore = useModuleStore();
const showEditor = ref(false);
const editingModule = ref<Module | null>(null);

onMounted(async () => {
  await moduleStore.loadModules();
});

const handleCreateClick = () => {
  editingModule.value = null;
  showEditor.value = true;
};

const handleEditClick = (module: Module) => {
  editingModule.value = module;
  showEditor.value = true;
};

const handleSubmit = async (module: Omit<Module, 'id'>) => {
  if (editingModule.value?.id) {
    await moduleStore.updateModule(editingModule.value.id, module);
  } else {
    await moduleStore.createModule(module);
  }
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteModule = async (module: Module) => {
  if (confirm(`Are you sure you want to delete the module "${module.name}"? This will also remove all associated content.`)) {
    await moduleStore.deleteModule(module.id);
  }
};
</script>

<template>
  <div class="view-list">
    <div class="view-header">
      <Button @click="handleCreateClick">+</Button>
    </div>

    <div v-if="moduleStore.modules.length === 0" class="view-empty">
      <p>No modules yet. Create your first module to get started!</p>
    </div>

    <div v-else class="view-grid">
      <ModuleCard
        v-for="module in moduleStore.modules"
        :key="module.id"
        :module="module"
        @view="() => router.push(`/modules/${module.id}`)"
        @edit="handleEditClick"
        @delete="deleteModule"
      />
    </div>

    <ModuleEditor
      v-if="showEditor"
      :module="editingModule"
      :is-open="showEditor"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

