<template>
  <div class="characters-view">
    <h1>Player Characters</h1>
    <div class="toolbar">
      <label>Filter by Party:</label>
      <select v-model="selectedPartyId">
        <option value="">All</option>
        <option v-for="party in parties" :key="party.id" :value="party.id">{{ party.name }}</option>
      </select>
      <label>Filter by Module:</label>
      <select v-model="selectedModuleId">
        <option value="">All</option>
        <option v-for="module in modules" :key="module.id" :value="module.id">{{ module.name }}</option>
      </select>
      <button @click="showEditor = true">Add Character</button>
    </div>
    <div v-if="filteredCharacters.length === 0" class="empty-state">
      <p>No characters found.</p>
    </div>
    <div class="characters-grid">
      <CharacterCard
        v-for="character in filteredCharacters"
        :key="character.id"
        :character="character"
        @edit="editCharacter"
        @delete="deleteCharacter"
      />
    </div>
    <CharacterEditor
      :isOpen="showEditor"
      :character="editingCharacter"
      @submit="handleSave"
      @cancel="closeEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, Ref } from 'vue';
import { useCharacterStore } from '@/stores/characters';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import CharacterCard from '@/components/CharacterCard.vue';
import CharacterEditor from '@/components/CharacterEditor.vue';
import type { PlayerCharacter } from '@/types';

const characterStore = useCharacterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();

const showEditor = ref(false);
const editingCharacter: Ref<PlayerCharacter | undefined> = ref();
const selectedPartyId = ref('');
const selectedModuleId = ref('');

const parties = computed(() => partyStore.parties);
const modules = computed(() => moduleStore.modules);

const filteredCharacters = computed(() => {
  let chars = characterStore.all;
  if (selectedPartyId.value) {
    chars = chars.filter((c: PlayerCharacter) => c.partyId === selectedPartyId.value);
  }
  if (selectedModuleId.value) {
    chars = chars.filter((c: PlayerCharacter) => c.moduleId === selectedModuleId.value);
  }
  return chars;
});

function editCharacter(character: PlayerCharacter) {
  editingCharacter.value = { ...character };
  showEditor.value = true;
}

function deleteCharacter(character: PlayerCharacter) {
  if (confirm(`Delete character "${character.name}"?`)) {
    characterStore.remove(character.id);
  }
}

function handleSave(character: PlayerCharacter) {
  if (editingCharacter.value && editingCharacter.value.id) {
    characterStore.update(editingCharacter.value.id, character);
  } else {
    characterStore.add(character);
  }
  showEditor.value = false;
  editingCharacter.value = undefined;
}

function closeEditor() {
  showEditor.value = false;
  editingCharacter.value = undefined;
}
</script>

<style scoped>
.characters-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}
.toolbar {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
}
.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
.empty-state {
  color: #888;
  text-align: center;
  margin: 2rem 0;
}
</style> 