<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import type { Module } from '@/types';
import ModuleEditor from '@/components/ModuleEditor.vue';
import ModuleCard from '@/components/ModuleCard.vue';
import Button from '@/components/common/Button.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';

const router = useRouter();
const moduleStore = useModuleStore();
const showEditor = ref(false);
const editingModule = ref<Module | null>(null);

onMounted(async () => {
  await moduleStore.load();
});

const handleCreateClick = () => {
  editingModule.value = null;
  showEditor.value = true;
};

const handleEditClick = (module: Module) => {
  editingModule.value = module;
  showEditor.value = true;
};

const handleSave = async (module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (editingModule.value?.id) {
    await moduleStore.update(editingModule.value.id, module);
  } else {
    await moduleStore.create(module);
  }
  showEditor.value = false;
  editingModule.value = {
    id: '',
    name: '',
    description: '',
    settings: {},
    noteTree: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteModule = async (module: Module) => {
  if (confirm(`Are you sure you want to delete ${module.name}?`)) {
    await moduleStore.remove(module.id);
  }
};
</script>

<template>
  <div class="view-root">
    <ViewHeader
      show-create
      create-title="Create Module"
      @create="handleCreateClick"
    />
    <div class="view-list">
    <div v-if="moduleStore.items.length === 0" class="view-empty">
      <p>No modules yet. Create your first module to get started!</p>
    </div>

    <div v-else class="view-grid">
      <ModuleCard
        v-for="module in moduleStore.items"
        :key="module.id"
        :module="module"
        @view="() => router.push(`/modules/${module.id}`)"
        @edit="() => { editingModule = module; showEditor = true; }"
        @delete="deleteModule"
      />
    </div>

    <ModuleEditor
      v-if="showEditor"
      :module="editingModule"
      :is-open="showEditor"
      @submit="handleSave"
      @cancel="handleCancel"
    />
  </div>
  </div>

</template>

