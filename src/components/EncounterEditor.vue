<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { Encounter, Combatant, Monster } from '@/types';
import ModuleSelector from './ModuleSelector.vue';
import BaseModal from './BaseModal.vue';
import Button from './Button.vue';

const props = defineProps<{
  encounter: Encounter | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', encounter: Omit<Encounter, 'id'>): void;
  (e: 'cancel'): void;
}>();

const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();

type EncounterFormData = Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>;

const editedEncounter = ref<EncounterFormData>({
  name: '',
  description: '',
  difficulty: 'easy',
  level: 1,
  xp: 0,
  combatants: [],
  status: 'preparing',
  currentRound: 0,
  currentTurn: 0,
  moduleId: moduleStore.currentModuleFilter === 'any' || moduleStore.currentModuleFilter === 'none' ? '' : (moduleStore.currentModuleFilter as string),
  partyId: '',
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
      combatants: [],
      status: 'preparing',
      currentRound: 0,
      currentTurn: 0,
      moduleId: moduleStore.currentModuleFilter === 'any' || moduleStore.currentModuleFilter === 'none' ? '' : (moduleStore.currentModuleFilter as string),
      partyId: '',
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
    combatants: [],
    status: 'preparing',
    currentRound: 0,
    currentTurn: 0,
    moduleId: moduleStore.currentModuleFilter === 'any' || moduleStore.currentModuleFilter === 'none' ? '' : (moduleStore.currentModuleFilter as string),
    partyId: '',
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
      <label>Party</label>
      <select v-model="editedEncounter.partyId">
        <option value="">Select Party</option>
        <option v-for="party in partyStore.filteredParties" :key="party.id" :value="party.id">
          {{ party.name }}
        </option>
      </select>
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
</style>
