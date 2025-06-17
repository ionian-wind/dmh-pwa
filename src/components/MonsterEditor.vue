<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMonsterStore } from '@/stores/monsters';
import { useModuleStore } from '@/stores/modules';
import type { Monster } from '@/types';
import ModuleSelector from "@/components/ModuleSelector.vue";
import BaseEditorModal from './BaseEditorModal.vue';

const props = defineProps<{
  monster: Monster | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', monster: Monster): void;
  (e: 'cancel'): void;
}>();

const monsterStore = useMonsterStore();
const moduleStore = useModuleStore();

const editedMonster = ref<Monster>({
  specialAbilities: [],
  id: '',
  name: '',
  type: '',
  size: 'Medium',
  alignment: 'Unaligned',
  armorClass: 10,
  hitPoints: 10,
  speed: {
    walk: 30,
    fly: 0,
    swim: 0,
    burrow: 0,
    climb: 0
  },
  abilities: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  },
  savingThrows: {},
  skills: {},
  damageVulnerabilities: [],
  damageResistances: [],
  damageImmunities: [],
  conditionImmunities: [],
  senses: [],
  languages: [],
  challengeRating: '1',
  xp: 0,
  traits: [],
  actions: [],
  legendaryActions: [],
  moduleId: '',
  description: '',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const newStat = ref<MonsterStat>({ name: '', value: '' });

const isEditing = computed(() => !!editedMonster.value.id);

watch(() => props.monster, (newMonster) => {
  if (newMonster) {
    editedMonster.value = { ...newMonster };
  }
}, { immediate: true });

const resetForm = () => {
  editedMonster.value = {
    createdAt: "", moduleId: "", updatedAt: "",
    id: '',
    name: '',
    type: '',
    size: 'Medium',
    alignment: 'Unaligned',
    armorClass: 10,
    hitPoints: 10,
    speed: {
      walk: 30,
      fly: 0,
      swim: 0,
      burrow: 0,
      climb: 0
    },
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    savingThrows: {},
    skills: {},
    damageVulnerabilities: [],
    damageResistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    senses: [],
    languages: ['Common'],
    challengeRating: '1/4',
    xp: 50,
    specialAbilities: [],
    actions: [],
    legendaryActions: [],
    description: ''
  };
};

const saveMonster = async () => {
  if (!editedMonster.value.name || !editedMonster.value.type) {
    alert('Name and type are required');
    return;
  }

  if (isEditing.value) {
    await monsterStore.updateMonster(editedMonster.value as Monster);
  } else {
    await monsterStore.addMonster({
      ...editedMonster.value,
      moduleId: moduleStore.currentModuleId
    } as Monster);
  }
  emit('submit', editedMonster.value);
  closeEditor();
};

const closeEditor = () => {
  resetForm();
  emit('cancel');
};
</script>

<template>
  <BaseEditorModal
    :isOpen="isOpen"
    :title="isEditing ? 'Edit Monster' : 'Add Monster'"
    submitLabel="Save Monster"
    cancelLabel="Cancel"
    @submit="saveMonster"
    @cancel="closeEditor"
  >
    <div class="form-section">
      <label>Module</label>
      <ModuleSelector
        v-model="editedMonster.moduleId"
        placeholder="No Module"
      />
    </div>
    <div class="form-section">
      <label>Name</label>
      <input v-model="editedMonster.name" type="text" required />
    </div>
    <div class="form-section">
      <label>Type</label>
      <input v-model="editedMonster.type" type="text" required />
    </div>
    <div class="form-section">
      <label>Size</label>
      <select v-model="editedMonster.size">
        <option value="Tiny">Tiny</option>
        <option value="Small">Small</option>
        <option value="Medium">Medium</option>
        <option value="Large">Large</option>
        <option value="Huge">Huge</option>
        <option value="Gargantuan">Gargantuan</option>
      </select>
    </div>
    <div class="form-section">
      <label>Alignment</label>
      <select v-model="editedMonster.alignment">
        <option value="Lawful Good">Lawful Good</option>
        <option value="Neutral Good">Neutral Good</option>
        <option value="Chaotic Good">Chaotic Good</option>
        <option value="Lawful Neutral">Lawful Neutral</option>
        <option value="Neutral">Neutral</option>
        <option value="Chaotic Neutral">Chaotic Neutral</option>
        <option value="Lawful Evil">Lawful Evil</option>
        <option value="Neutral Evil">Neutral Evil</option>
        <option value="Chaotic Evil">Chaotic Evil</option>
        <option value="Unaligned">Unaligned</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-section">
        <label>Armor Class</label>
        <input v-model.number="editedMonster.armorClass" type="number" min="0" />
      </div>
      <div class="form-section">
        <label>Hit Points</label>
        <input v-model.number="editedMonster.hitPoints" type="number" min="1" />
      </div>
    </div>
    <div class="form-section">
      <label>Challenge Rating</label>
      <input v-model="editedMonster.challengeRating" type="text" />
    </div>
    <div class="form-section">
      <label>Description</label>
      <textarea v-model="editedMonster.description" rows="3"></textarea>
    </div>
    <div class="form-section">
      <label>Abilities</label>
      <textarea v-model="editedMonster.abilities" rows="3"></textarea>
    </div>
    <div class="form-section">
      <label>Languages</label>
      <input v-model="editedMonster.languages" type="text" placeholder="Comma-separated list" />
    </div>
  </BaseEditorModal>
</template>

<style scoped>
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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.editor-content h2 {
  margin: 0 0 1.5rem 0;
  color: var(--color-text);
}

.form-section {
  margin-bottom: 1rem;
}

.form-section label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
