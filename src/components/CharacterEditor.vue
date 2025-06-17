<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import type { PlayerCharacter } from '@/types';

const props = defineProps<{
  character?: PlayerCharacter;
  partyId?: string;
}>();

const emit = defineEmits<{
  (e: 'save', character: PlayerCharacter): void;
  (e: 'close'): void;
}>();

const partyStore = usePartyStore();
const moduleStore = useModuleStore();

const character = ref<Partial<PlayerCharacter>>(props.character || {
  name: '',
  level: 1,
  class: '',
  race: '',
  playerName: '',
  hitPoints: 10,
  armorClass: 10,
  speed: 30,
  stats: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  },
  moduleId: moduleStore.currentModuleId
});

const isEditing = computed(() => !!props.character);

const abilityModifier = (score: number) => {
  return Math.floor((score - 10) / 2);
};

const formatModifier = (modifier: number) => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

const saveCharacter = async () => {
  if (!character.value.name || !character.value.class || !character.value.race) {
    alert('Name, class, and race are required');
    return;
  }

  if (isEditing.value) {
    emit('save', character.value as PlayerCharacter);
  } else {
    const newCharacter = await partyStore.addCharacter({
      ...character.value,
      moduleId: moduleStore.currentModuleId
    } as PlayerCharacter);

    if (props.partyId) {
      await partyStore.addCharacterToParty(props.partyId, newCharacter.id);
    }

    emit('save', newCharacter);
  }
};
</script>

<template>
  <div class="character-editor">
    <h2>{{ isEditing ? 'Edit Character' : 'Create Character' }}</h2>

    <div class="form-group">
      <label>Name</label>
      <input v-model="character.name" type="text" required />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Level</label>
        <input v-model.number="character.level" type="number" min="1" max="20" />
      </div>

      <div class="form-group">
        <label>Class</label>
        <input v-model="character.class" type="text" required />
      </div>

      <div class="form-group">
        <label>Race</label>
        <input v-model="character.race" type="text" required />
      </div>
    </div>

    <div class="form-group">
      <label>Player Name</label>
      <input v-model="character.playerName" type="text" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Hit Points</label>
        <input v-model.number="character.hitPoints" type="number" min="1" />
      </div>

      <div class="form-group">
        <label>Armor Class</label>
        <input v-model.number="character.armorClass" type="number" min="0" />
      </div>

      <div class="form-group">
        <label>Speed</label>
        <input v-model.number="character.speed" type="number" min="0" />
      </div>
    </div>

    <div class="stats-section">
      <h3>Ability Scores</h3>
      <div class="stats-grid">
        <div v-for="(value, key) in character.stats" :key="key" class="stat-input">
          <label>{{ key.charAt(0).toUpperCase() + key.slice(1) }}</label>
          <input
            v-model.number="character.stats[key]"
            type="number"
            min="1"
            max="20"
          />
          <span class="modifier">{{ formatModifier(abilityModifier(value)) }}</span>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button @click="emit('close')" class="cancel-btn">Cancel</button>
      <button @click="saveCharacter" class="save-btn">Save Character</button>
    </div>
  </div>
</template>

<style scoped>
.character-editor {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.character-editor h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.stats-section {
  margin: 2rem 0;
}

.stats-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
}

.stat-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-input label {
  font-size: 0.9rem;
  color: #666;
}

.stat-input input {
  width: 60px;
  text-align: center;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.modifier {
  font-size: 0.9rem;
  color: #666;
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
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
}

.cancel-btn {
  background: #f5f5f5;
  color: #333;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.save-btn {
  background: #2196f3;
  color: white;
}

.save-btn:hover {
  background: #1976d2;
}
</style> 
