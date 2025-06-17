<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useModuleStore } from '@/stores/modules';
import { Encounter } from '@/types';
import ModuleSelector from './ModuleSelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';

const props = defineProps<{
  encounter: Encounter | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', encounter: Omit<Encounter, 'id'>): void;
  (e: 'cancel'): void;
}>();

const moduleStore = useModuleStore();

type EncounterFormData = Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>;

const editedEncounter = ref<EncounterFormData>({
  name: '',
  description: '',
  difficulty: 'easy',
  level: 1,
  xp: 0,
  monsters: {},
  currentRound: 0,
  currentTurn: 0,
  moduleId: moduleStore.currentModuleFilter === 'any' || moduleStore.currentModuleFilter === 'none' ? '' : (moduleStore.currentModuleFilter as string),
  notes: ''
});

const isEditing = computed(() => !!props.encounter?.id);

watch(() => props.encounter, (newEncounter) => {
  if (newEncounter) {
    const { id, createdAt, updatedAt, ...encounterData } = newEncounter;
    editedEncounter.value = encounterData;
  } else {
    editedEncounter.value = {
      name: '',
      description: '',
      difficulty: 'easy',
      level: 1,
      xp: 0,
      monsters: {},
      currentRound: 0,
      currentTurn: 0,
      moduleId: moduleStore.currentModuleFilter === 'any' || moduleStore.currentModuleFilter === 'none' ? '' : (moduleStore.currentModuleFilter as string),
      notes: ''
    };
  }
}, { immediate: true });

const resetForm = () => {
  editedEncounter.value = {
    name: '',
    description: '',
    difficulty: 'easy',
    level: 1,
    xp: 0,
    monsters: {},
    currentRound: 0,
    currentTurn: 0,
    moduleId: moduleStore.currentModuleFilter === 'any' || moduleStore.currentModuleFilter === 'none' ? '' : (moduleStore.currentModuleFilter as string),
    notes: ''
  };
};

const handleSubmit = () => {
  if (!editedEncounter.value.name) {
    alert('Name is required');
    return;
  }
  
  if (!editedEncounter.value.moduleId) {
    alert('Module is required');
    return;
  }
  
  emit('submit', {
    ...editedEncounter.value,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  closeEditor();
};

const closeEditor = () => {
  resetForm();
  emit('cancel');
};

defineExpose({
  openEditor: (encounterToEdit?: Encounter) => {
    if (encounterToEdit) {
      const { id, createdAt, updatedAt, ...encounterData } = encounterToEdit;
      editedEncounter.value = encounterData;
    } else {
      resetForm();
    }
  }
});
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isEditing ? 'Edit Encounter' : 'Add Encounter'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save Encounter"
    cancelLabel="Cancel"
    @submit="handleSubmit"
    @cancel="closeEditor"
  >
    <div class="form-section">
      <label>Name</label>
      <input v-model="editedEncounter.name" required>
    </div>
    <div class="form-section">
      <label>Description</label>
      <textarea 
        v-model="editedEncounter.description" 
        placeholder="Description"
        rows="3"
      ></textarea>
    </div>
    <div class="form-section">
      <label>Module *</label>
      <ModuleSelector
        v-model="editedEncounter.moduleId"
        placeholder="Select Module"
        required
      />
    </div>
    <div class="form-section">
      <label>Difficulty</label>
      <select v-model="editedEncounter.difficulty">
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
        <option value="deadly">Deadly</option>
      </select>
    </div>
    <div class="form-section">
      <label>Level</label>
      <input v-model.number="editedEncounter.level" type="number" min="1" max="20">
    </div>
    <div class="form-section">
      <label>XP</label>
      <input v-model.number="editedEncounter.xp" type="number" min="0">
    </div>
    <div class="form-section">
      <label>Notes</label>
      <textarea 
        v-model="editedEncounter.notes" 
        placeholder="Additional notes about this encounter"
        rows="3"
      ></textarea>
    </div>
  </BaseModal>
</template>

<style scoped>
.form-section {
  margin-bottom: 1.5rem;
}

.form-section label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-weight: var(--font-medium);
}

.form-section input,
.form-section select,
.form-section textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.monsters-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
}

.available-monsters,
.selected-monsters {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.available-monsters h4,
.selected-monsters h4 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1rem;
}

.monsters-list {
  max-height: 200px;
  overflow-y: auto;
}

.monster-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;
}

.monster-item:hover {
  background: var(--color-background-mute);
}

.monster-item.selected {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.monster-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.monster-details {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.remove-btn {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  transition: background-color 0.2s;
}

.remove-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
