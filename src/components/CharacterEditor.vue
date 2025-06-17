<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { PlayerCharacter, UUID } from '@/types';
import BaseModal from './BaseModal.vue';
import Button from './Button.vue';

const props = withDefaults(defineProps<{
  character?: PlayerCharacter | null;
  isOpen: boolean;
  partyId?: UUID;
}>(), {
  character: null
});

const emit = defineEmits<{
  (e: 'submit', character: PlayerCharacter): void;
  (e: 'cancel'): void;
}>();

const statKeys = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

type StatKey = typeof statKeys[number];

const defaultStats = () => ({
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
});

const defaultHitPoints = () => ({
  maximum: 10,
  current: 10,
  temporary: 0,
});

const blankCharacter = (): PlayerCharacter => ({
  id: '',
  name: '',
  level: 1,
  class: '',
  race: '',
  playerName: '',
  alignment: '',
  background: '',
  stats: defaultStats(),
  hitPoints: defaultHitPoints(),
  armorClass: 10,
  initiative: 0,
  speed: 30,
  proficiencies: [],
  equipment: [],
  spells: [],
  features: [],
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  moduleId: undefined,
  partyId: props.partyId ?? undefined,
});

const editedCharacter = ref<PlayerCharacter>(props.character ? { ...props.character } : blankCharacter());
const isEditing = computed(() => !!(props.character && props.character.id));

watch(() => props.character, (newChar) => {
  editedCharacter.value = newChar ? { ...newChar } : blankCharacter();
});

watch(() => props.isOpen, (open) => {
  if (!open) resetForm();
});

function resetForm() {
  editedCharacter.value = blankCharacter();
}

function handleSubmit() {
  if (!editedCharacter.value.name || !editedCharacter.value.class || !editedCharacter.value.race) {
    alert('Name, class, and race are required');
    return;
  }
  emit('submit', { ...editedCharacter.value });
  resetForm();
}

function handleCancel() {
  resetForm();
  emit('cancel');
}

function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}
function formatModifier(mod: number) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

const spellsString = computed({
  get: () => (Array.isArray(editedCharacter.value.spells) ? editedCharacter.value.spells.join(', ') : ''),
  set: (val: string) => {
    editedCharacter.value.spells = val.split(',').map(s => s.trim()).filter(Boolean);
  }
});

const featuresString = computed({
  get: () => (Array.isArray(editedCharacter.value.features) ? editedCharacter.value.features.join(', ') : ''),
  set: (val: string) => {
    editedCharacter.value.features = val.split(',').map(s => s.trim()).filter(Boolean);
  }
});
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isEditing ? 'Edit Character' : 'Create Character'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save Character"
    cancelLabel="Cancel"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="form-section">
      <h3>Player Name</h3>
      <div class="form-grid">
        <div class="form-group">
          <input v-model="editedCharacter.playerName" type="text" />
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>Basic Information</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Name</label>
          <input v-model="editedCharacter.name" type="text" required />
        </div>
        <div class="form-group">
          <label>Level</label>
          <input v-model.number="editedCharacter.level" type="number" min="1" max="20" />
        </div>
        <div class="form-group">
          <label>Class</label>
          <input v-model="editedCharacter.class" type="text" required />
        </div>
        <div class="form-group">
          <label>Race</label>
          <input v-model="editedCharacter.race" type="text" required />
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>Combat & Stats</h3>
      <div class="combat-grid">
        <div class="combat-stat">
          <label>Armor Class</label>
          <input v-model.number="editedCharacter.armorClass" type="number" min="0" />
        </div>
        <div class="combat-stat">
          <label>Initiative</label>
          <input v-model.number="editedCharacter.initiative" type="number" />
        </div>
        <div class="combat-stat">
          <label>Speed</label>
          <input v-model.number="editedCharacter.speed" type="number" min="0" />
        </div>
      </div>
      <div class="hit-points">
        <h4>Hit Points</h4>
        <div class="hp-row">
          <input v-model.number="editedCharacter.hitPoints.current" type="number" min="0" placeholder="Current" />
          <span class="hp-separator">/</span>
          <input v-model.number="editedCharacter.hitPoints.maximum" type="number" min="1" placeholder="Max" />
          <span class="hp-separator">/</span>
          <input v-model.number="editedCharacter.hitPoints.temporary" type="number" min="0" placeholder="Temp" />
        </div>
      </div>
      <div class="stats-section">
        <h3>Ability Scores</h3>
        <div class="stats-grid">
          <div v-for="stat in statKeys" :key="stat" class="stat-input">
            <label>{{ stat.charAt(0).toUpperCase() + stat.slice(1) }}</label>
            <input v-model.number="editedCharacter.stats[stat]" type="number" min="1" max="20" />
            <span class="modifier">{{ formatModifier(abilityModifier(editedCharacter.stats[stat])) }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>Background & Details</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Alignment</label>
          <input v-model="editedCharacter.alignment" type="text" />
        </div>
        <div class="form-group">
          <label>Background</label>
          <input v-model="editedCharacter.background" type="text" />
        </div>
        <div class="form-group">
          <label>Proficiencies (comma separated)</label>
          <input v-model="editedCharacter.proficiencies" type="text" @blur="editedCharacter.proficiencies = editedCharacter.proficiencies.toString().split(',').map(s => s.trim()).filter(Boolean)" />
        </div>
        <div class="form-group">
          <label>Equipment (comma separated)</label>
          <input v-model="editedCharacter.equipment" type="text" @blur="editedCharacter.equipment = editedCharacter.equipment.toString().split(',').map(s => s.trim()).filter(Boolean)" />
        </div>
        <div class="form-group">
          <label>Spells (comma separated)</label>
          <input v-model="spellsString" type="text" />
        </div>
        <div class="form-group">
          <label>Features (comma separated)</label>
          <input v-model="featuresString" type="text" />
        </div>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea v-model="editedCharacter.notes" rows="3" />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.form-section {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: var(--border-radius);
}

.form-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--color-text);
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.combat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.combat-stat {
  text-align: center;
  background: var(--color-background);
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.combat-stat label {
  font-size: 0.9rem;
  color: var(--color-text-light);
  margin-bottom: 0.25rem;
  display: block;
}

.combat-stat input {
  width: 60px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.hit-points {
  text-align: center;
  background: var(--color-background);
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.hit-points h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1.1rem;
}

.hp-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: bold;
}

.hp-row input {
  width: 80px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
}

.hp-separator {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text-light);
}

.stats-section {
  margin: 2rem 0 0 0;
}

.stats-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-input {
  text-align: center;
  background: var(--color-background);
  padding: 1rem;
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.stat-input label {
  font-size: 0.9rem;
  color: var(--color-text-light);
  margin-bottom: 0.25rem;
  display: block;
}

.stat-input input {
  width: 60px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.modifier {
  font-size: 1rem;
  color: var(--color-text-light);
  display: block;
}
</style> 