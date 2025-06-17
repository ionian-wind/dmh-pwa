<template>
  <div class="characters-view">
    <div class="view-header">
      <h1>Characters</h1>
      <button @click="handleCreateClick" class="create-btn">Create Character</button>
    </div>

    <div v-if="characterStore.all.length === 0" class="empty-state">
      <p>No characters yet. Create your first character to get started!</p>
    </div>

    <div v-else class="characters-grid">
      <div v-for="character in characterStore.all" :key="character.id" class="character-card">
        <CharacterCard
          :character="character"
          @view="character => $router.push(`/characters/${character.id}`)"
          @edit="() => handleEditClick(character)"
          @delete="() => deleteCharacter(character)"
        />
      </div>
    </div>

    <CharacterEditor
      v-if="showEditor"
      :character="editingCharacter"
      :is-open="showEditor"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import CharacterCard from '@/components/CharacterCard.vue';
import CharacterEditor from '@/components/CharacterEditor.vue';
import type { PlayerCharacter } from '@/types';

const router = useRouter();
const characterStore = useCharacterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const showEditor = ref(false);
const editingCharacter = ref<PlayerCharacter | null>(null);

onMounted(async () => {
  await Promise.all([
    partyStore.loadParties?.(),
    moduleStore.loadModules?.()
  ]);
});

const handleCreateClick = () => {
  editingCharacter.value = null;
  showEditor.value = true;
};

const handleEditClick = (character: PlayerCharacter) => {
  editingCharacter.value = character;
  showEditor.value = true;
};

const handleSubmit = async (character: PlayerCharacter) => {
  if (character.id) {
    await characterStore.update(character.id, character);
  } else {
    await characterStore.add(character);
  }
  showEditor.value = false;
};

const handleCancel = () => {
  showEditor.value = false;
};

const deleteCharacter = async (character: PlayerCharacter) => {
  if (confirm(`Are you sure you want to delete the character "${character.name}"?`)) {
    await characterStore.remove(character.id);
  }
};
</script>

<style scoped>
.characters-view {
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
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.create-btn:hover {
  background: var(--color-primary-dark);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text-light);
}

.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
</style> 