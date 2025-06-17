<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEncounterStore } from '@/stores/encounters';
import { useModuleStore } from '@/stores/modules';
import type { Encounter } from '@/types';
import EncounterEditor from '@/components/EncounterEditor.vue';

const encounterStore = useEncounterStore();
const moduleStore = useModuleStore();

const isEditorOpen = ref(false);
const selectedEncounter = ref<Encounter | null>(null);

onMounted(async () => {
  await Promise.all([
    encounterStore.loadEncounters(),
    moduleStore.loadModules()
  ]);
});

const handleCreate = () => {
  selectedEncounter.value = null;
  isEditorOpen.value = true;
};

const handleEdit = (encounter: Encounter) => {
  selectedEncounter.value = encounter;
  isEditorOpen.value = true;
};

const handleDelete = async (encounter: Encounter) => {
  if (confirm(`Are you sure you want to delete the encounter "${encounter.name}"?`)) {
    await encounterStore.deleteEncounter(encounter.id);
  }
};

const handleSubmit = async (encounter: Encounter) => {
  if (selectedEncounter.value) {
    await encounterStore.updateEncounter(encounter.id, encounter);
  } else {
    await encounterStore.createEncounter(encounter);
  }
  isEditorOpen.value = false;
};

const handleCancel = () => {
  isEditorOpen.value = false;
};

const getModuleName = (moduleId: string | null) => {
  if (!moduleId) return 'No Module';
  const module = moduleStore.modules.find(m => m.id === moduleId);
  return module ? module.name : 'Unknown Module';
};
</script>

<template>
  <div class="encounters-view">
    <div class="view-header">
      <h1>Encounters</h1>
      <button @click="handleCreate" class="create-btn">Create Encounter</button>
    </div>

    <div class="encounters-grid">
      <div
        v-for="encounter in encounterStore.encounters"
        :key="encounter.id"
        class="encounter-card"
      >
        <div class="card-header">
          <h2>{{ encounter.name }}</h2>
          <div class="card-actions">
            <button @click="handleEdit(encounter)" class="edit-btn">Edit</button>
            <button @click="handleDelete(encounter)" class="delete-btn">Delete</button>
          </div>
        </div>

        <div class="card-content">
          <div class="encounter-meta">
            <span class="meta-item">
              <span class="label">Level:</span>
              <span class="value">{{ encounter.level }}</span>
            </span>
            <span class="meta-item">
              <span class="label">Difficulty:</span>
              <span class="value">{{ encounter.difficulty }}</span>
            </span>
            <span class="meta-item">
              <span class="label">XP:</span>
              <span class="value">{{ encounter.xp }}</span>
            </span>
            <span class="meta-item">
              <span class="label">Module:</span>
              <span class="value">{{ getModuleName(encounter.moduleId) }}</span>
            </span>
          </div>

          <p v-if="encounter.description" class="description">
            {{ encounter.description }}
          </p>

          <div class="monsters-summary">
            <span class="label">Monsters:</span>
            <span class="value">{{ encounter.monsters?.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <EncounterEditor
      :encounter="selectedEncounter"
      :is-open="isEditorOpen"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<style scoped>
.encounters-view {
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
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.create-btn:hover {
  background: var(--color-primary-dark);
}

.encounters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.encounter-card {
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.card-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn,
.delete-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.edit-btn {
  background: var(--color-primary);
  color: white;
}

.delete-btn {
  background: var(--color-danger);
  color: white;
}

.edit-btn:hover {
  background: var(--color-primary-dark);
}

.delete-btn:hover {
  background: var(--color-danger-dark);
}

.card-content {
  padding: 1rem;
}

.encounter-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-item .label {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.meta-item .value {
  color: var(--color-text);
  font-weight: 500;
}

.description {
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.monsters-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: var(--border-radius);
}

.monsters-summary .label {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.monsters-summary .value {
  color: var(--color-text);
  font-weight: 500;
}
</style> 
