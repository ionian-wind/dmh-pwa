<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEncounterStore } from '@/stores/encounters';
import { useModuleStore } from '@/stores/modules';
import type { Encounter } from '@/types';
import EncounterEditor from '@/components/EncounterEditor.vue';
import EncounterCard from '@/components/EncounterCard.vue';

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

const handleSubmit = async (encounter: Omit<Encounter, 'id'>) => {
  if (selectedEncounter.value?.id) {
    await encounterStore.updateEncounter(selectedEncounter.value.id, encounter);
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
      <EncounterCard
        v-for="encounter in encounterStore.encounters"
        :key="encounter.id"
        :encounter="encounter"
        @view="encounter => $router.push(`/encounters/${encounter.id}`)"
        @edit="handleEdit"
        @delete="handleDelete"
      />
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
</style> 
