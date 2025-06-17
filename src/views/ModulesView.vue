<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useModuleStore } from '@/stores/modules';
import type { Module } from '@/types';
import ModuleEditor from '@/components/ModuleEditor.vue';
import ModuleCard from '@/components/ModuleCard.vue';

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

const handleSubmit = async (module: Module) => {
  if (module.id) {
    await moduleStore.updateModule(module.id, module);
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
  <div class="modules-view">
    <div class="view-header">
      <h1>Modules</h1>
      <button @click="handleCreateClick" class="create-btn">Create Module</button>
    </div>

    <div v-if="moduleStore.modules.length === 0" class="empty-state">
      <p>No modules yet. Create your first module to get started!</p>
    </div>

    <div v-else class="modules-grid">
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

<style scoped>
.modules-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.view-header h1 {
  margin: 0;
  color: var(--color-text);
}

.create-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.create-btn:hover {
  background: var(--color-primary-dark);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text-light);
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.module-card {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: transform 0.2s;
}

.module-card:hover {
  transform: translateY(-2px);
}

.card-content {
  padding: 1.5rem;
}

.card-content h2 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.description {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

.view-btn,
.edit-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.view-btn {
  background: var(--color-primary);
  color: white;
}

.edit-btn {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.delete-btn {
  background: var(--color-danger);
  color: white;
}

.view-btn:hover {
  background: var(--color-primary-dark);
}

.edit-btn:hover {
  background: var(--color-background-mute);
}

.delete-btn:hover {
  background: var(--color-danger-dark);
}
</style> 
