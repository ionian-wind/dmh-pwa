<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { Encounter, Combatant, Monster } from '@/types';
import ModuleSelector from './ModuleSelector.vue';
import BaseEditorModal from './BaseEditorModal.vue';

const props = defineProps<{
  encounter: Encounter | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', encounter: Encounter): void;
  (e: 'cancel'): void;
}>();

const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();

const editedEncounter = ref<Encounter>({
  name: '',
  description: '',
  difficulty: 'Easy',
  level: 1,
  xp: 0,
  monsters: [],
  notes: '',
  moduleId: null
});

const isEditing = computed(() => !!editedEncounter.value.id);

watch(() => props.encounter, (newEncounter) => {
  if (newEncounter) {
    editedEncounter.value = { ...newEncounter };
  } else {
    editedEncounter.value = {
      name: '',
      description: '',
      difficulty: 'Easy',
      level: 1,
      xp: 0,
      monsters: [],
      notes: '',
      moduleId: null
    };
  }
}, { immediate: true });

watch(() => props.isOpen, (newVal) => {
  editedEncounter.value.isOpen = newVal || false;
});

const resetForm = () => {
  editedEncounter.value = {
    name: '',
    description: '',
    difficulty: 'Easy',
    level: 1,
    xp: 0,
    monsters: [],
    notes: '',
    moduleId: null
  };
};

const addMonster = (monster: Monster) => {
  const existingMonster = editedEncounter.value.monsters.find(m => m.id === monster.id);
  if (existingMonster) {
    existingMonster.quantity++;
  } else {
    editedEncounter.value.monsters.push({
      id: monster.id,
      quantity: 1
    });
  }
};

const removeMonster = (monsterId: string) => {
  const index = editedEncounter.value.monsters.findIndex(m => m.id === monsterId);
  if (index !== -1) {
    const monster = editedEncounter.value.monsters[index];
    if (monster.quantity > 1) {
      monster.quantity--;
    } else {
      editedEncounter.value.monsters.splice(index, 1);
    }
  }
};

const getMonsterDetails = (monsterId: string) => {
  return monsterStore.monsters.find(m => m.id === monsterId);
};

const calculateTotalXP = () => {
  return editedEncounter.value.monsters.reduce((total, monster) => {
    const monsterDetails = getMonsterDetails(monster.id);
    return total + (monsterDetails?.xp || 0) * monster.quantity;
  }, 0);
};

const updateDifficulty = () => {
  const totalXP = calculateTotalXP();
  const level = editedEncounter.value.level;

  // Simple difficulty calculation based on XP and level
  if (totalXP < level * 100) {
    editedEncounter.value.difficulty = 'Easy';
  } else if (totalXP < level * 200) {
    editedEncounter.value.difficulty = 'Medium';
  } else if (totalXP < level * 300) {
    editedEncounter.value.difficulty = 'Hard';
  } else {
    editedEncounter.value.difficulty = 'Deadly';
  }
};

watch(() => editedEncounter.value.monsters, () => {
  editedEncounter.value.xp = calculateTotalXP();
  updateDifficulty();
}, { deep: true });

watch(() => editedEncounter.value.level, () => {
  updateDifficulty();
});

const handleSubmit = () => {
  if (!editedEncounter.value.name) {
    alert('Name is required');
    return;
  }
  emit('submit', editedEncounter.value);
  closeEditor();
};

const closeEditor = () => {
  resetForm();
  emit('cancel');
};

defineExpose({
  openEditor: (encounterToEdit?: Encounter) => {
    if (encounterToEdit) {
      editedEncounter.value = { ...encounterToEdit };
    } else {
      resetForm();
    }
  }
});
</script>

<template>
  <BaseEditorModal
    :isOpen="isOpen"
    :title="isEditing ? 'Edit Encounter' : 'Add Encounter'"
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
      <label>Module</label>
      <ModuleSelector
        v-model="editedEncounter.moduleId"
        placeholder="No Module"
      />
    </div>
    <div class="form-section">
      <label>Party</label>
      <select v-model="editedEncounter.partyId">
        <option value="">Select Party</option>
        <option v-for="party in partyStore.parties" :key="party.id" :value="party.id">
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
      <h4>Monsters</h4>
      
      <div class="monsters-list">
        <div
          v-for="monster in editedEncounter.monsters"
          :key="monster.id"
          class="monster-item"
        >
          <div class="monster-info">
            <span class="monster-name">{{ getMonsterDetails(monster.id)?.name || 'Unknown Monster' }}</span>
            <span class="monster-type">{{ getMonsterDetails(monster.id)?.type || 'Unknown' }}</span>
            <span class="monster-cr">CR {{ getMonsterDetails(monster.id)?.challengeRating || 'Unknown' }}</span>
          </div>
          <div class="monster-quantity">
            <button
              type="button"
              class="quantity-btn"
              @click="removeMonster(monster.id)"
            >
              -
            </button>
            <span class="quantity">{{ monster.quantity }}</span>
            <button
              type="button"
              class="quantity-btn"
              @click="addMonster(getMonsterDetails(monster.id)!)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div class="monster-selector">
        <select
          v-model="selectedMonster"
          @change="addMonster($event.target.value)"
        >
          <option value="">Add a monster...</option>
          <option
            v-for="monster in monsterStore.monsters"
            :key="monster.id"
            :value="monster"
          >
            {{ monster.name }} (CR {{ monster.challengeRating }})
          </option>
        </select>
      </div>

      <div class="encounter-summary">
        <div class="summary-item">
          <span class="label">Total XP:</span>
          <span class="value">{{ editedEncounter.xp }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Difficulty:</span>
          <span class="value">{{ editedEncounter.difficulty }}</span>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h3>Notes</h3>
      <div class="form-group">
        <textarea
          v-model="editedEncounter.notes"
          rows="3"
          placeholder="Additional notes about the encounter"
        ></textarea>
      </div>
    </div>
  </BaseEditorModal>
</template>

<style scoped>
.encounter-editor {
  margin-bottom: 1rem;
}

.add-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
}

.add-btn:hover {
  background: var(--color-primary-dark);
}

.editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.editor-content {
  background: var(--color-background);
  padding: 2rem;
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.editor-content h2 {
  margin: 0 0 1.5rem 0;
  color: var(--color-text);
}

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

.monsters-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 0.5rem;
}

.monster-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  margin-bottom: 0.5rem;
  background: var(--color-background-soft);
}

.monster-info {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.monster-name {
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.monster-type {
  color: var(--color-text-light);
}

.monster-cr {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.monster-quantity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quantity-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
  transition: background-color 0.2s;
}

.quantity-btn:hover {
  background: var(--color-background-mute);
}

.quantity {
  min-width: 2rem;
  text-align: center;
  font-weight: 500;
  color: var(--color-text);
}

.monster-selector {
  margin-bottom: 1rem;
}

.monster-selector select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.encounter-summary {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: var(--color-background);
  border-radius: var(--border-radius);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-item .label {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.summary-item .value {
  color: var(--color-text);
  font-size: 1.2rem;
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-btn,
.save-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
}

.cancel-btn {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.save-btn {
  background: var(--color-primary);
  color: white;
}

.cancel-btn:hover {
  background: var(--color-background-mute);
}

.save-btn:hover {
  background: var(--color-primary-dark);
}
</style>
