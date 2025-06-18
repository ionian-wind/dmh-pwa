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
  moduleId: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? moduleStore.currentModuleFilter : '',
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
      moduleId: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? moduleStore.currentModuleFilter : '',
      notes: ''
    };
  }
}, { immediate: true });

watch(() => moduleStore.currentModuleFilter, (newFilter) => {
  if (!props.encounter && props.isOpen) {
    editedEncounter.value.moduleId = (newFilter !== 'any' && newFilter !== 'none' && newFilter) ? newFilter : '';
  }
});

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
    moduleId: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? moduleStore.currentModuleFilter : '',
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
      <h3>Basic Information</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="encounter-name">Name</label>
          <input id="encounter-name" v-model="editedEncounter.name" type="text" required />
        </div>
        <div class="form-group">
          <label for="encounter-module">Module</label>
          <ModuleSelector
            id="encounter-module"
            v-model="editedEncounter.moduleId"
            placeholder="Select Module"
            required
          />
        </div>
        <div class="form-group">
          <label for="encounter-difficulty">Difficulty</label>
          <select id="encounter-difficulty" v-model="editedEncounter.difficulty">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="deadly">Deadly</option>
          </select>
        </div>
        <div class="form-group">
          <label for="encounter-level">Level</label>
          <input id="encounter-level" v-model.number="editedEncounter.level" type="number" min="1" max="20" />
        </div>
        <div class="form-group">
          <label for="encounter-xp">XP</label>
          <input id="encounter-xp" v-model.number="editedEncounter.xp" type="number" min="0" />
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>Description</h3>
      <div class="form-group">
        <label for="encounter-description">Description</label>
        <textarea id="encounter-description" v-model="editedEncounter.description" rows="3" placeholder="Description"></textarea>
      </div>
    </div>
    <div class="form-section">
      <h3>Notes</h3>
      <div class="form-group">
        <label for="encounter-notes">Notes</label>
        <textarea id="encounter-notes" v-model="editedEncounter.notes" rows="3" placeholder="Additional notes about this encounter"></textarea>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
/* No need for .form-section, .form-grid, .form-group, label, input, select, textarea styles here; now in global.css */
</style>
