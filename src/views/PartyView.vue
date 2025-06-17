<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import { useCharacterStore } from '@/stores/characters';
import { Party, PlayerCharacter } from '@/types';
import PartyEditor from '@/components/PartyEditor.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import CharacterEditor from '@/components/CharacterEditor.vue';

const route = useRoute();
const router = useRouter();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const characterStore = useCharacterStore();

const showEditor = ref(false);
const party = ref<Party | null>(null);
const showCharacterEditor = ref(false);
const editingCharacter = ref<PlayerCharacter | undefined>();

const partyId = route.params.id as string;

const module = computed(() => {
  if (!party.value) return null;
  return moduleStore.getModuleById(party.value.moduleId);
});

const allCharacters = computed(() => characterStore.all);
const partyCharacters = computed(() => {
  const p = party.value;
  if (!p) return [];
  return allCharacters.value.filter(c => c.partyId === p.id);
});
const availableCharacters = computed(() => {
  const p = party.value;
  if (!p) return [];
  return allCharacters.value.filter(c => !c.partyId || c.partyId !== p.id);
});

onMounted(async () => {
  const foundParty = partyStore.getPartyById(partyId);
  if (!foundParty) {
    await router.push('/parties');
    return;
  }
  party.value = foundParty;
});

const handleDeleteParty = async () => {
  if (!party.value) return;
  if (confirm(`Are you sure you want to delete the party "${party.value.name}"?`)) {
    partyStore.deleteParty(party.value.id);
    await router.push('/parties');
  }
};

const handleAddCharacter = () => {
  editingCharacter.value = undefined;
  showCharacterEditor.value = true;
};

const handleEditCharacter = (character: PlayerCharacter) => {
  editingCharacter.value = { ...character };
  showCharacterEditor.value = true;
};

const handleDeleteCharacter = (character: PlayerCharacter) => {
  if (confirm(`Remove character "${character.name}" from this party?`)) {
    characterStore.setParty(character.id, null);
  }
};

const handleLinkCharacter = (character: PlayerCharacter) => {
  if (!party.value) return;
  characterStore.setParty(character.id, party.value.id);
};

const handleCharacterSubmit = (character: PlayerCharacter) => {
  if (!party.value) return;
  if (editingCharacter.value && editingCharacter.value.id) {
    characterStore.update(editingCharacter.value.id, character);
  } else {
    const newChar = characterStore.add({ ...character, partyId: party.value.id });
    characterStore.setParty(newChar.id, party.value.id);
  }
  showCharacterEditor.value = false;
  editingCharacter.value = undefined;
};

const handleCharacterCancel = () => {
  showCharacterEditor.value = false;
  editingCharacter.value = undefined;
};
</script>

<template>
  <div v-if="party">
    <div class="party-view">
      <div class="header">
        <h1>{{ party.name }}</h1>
        <div class="meta">
          <span v-if="module">Module: {{ module.name }}</span>
          <span class="character-count">{{ partyCharacters.length }} characters</span>
        </div>
        <div class="actions">
          <button @click="showEditor = true">Edit Party</button>
          <button @click="handleDeleteParty" class="delete-btn">Delete Party</button>
        </div>
      </div>
      <PartyEditor
        :party="party"
        :isOpen="showEditor"
        @submit="(updatedParty) => { partyStore.updateParty(updatedParty.id, updatedParty); party.value = updatedParty; showEditor.value = false; }"
        @cancel="showEditor.value = false"
      />
      <section class="content-section">
        <h2>Characters</h2>
        <button @click="handleAddCharacter" class="add-btn">Add Character</button>
        <div v-if="partyCharacters.length === 0" class="empty-state">
          <p>No characters in this party yet</p>
        </div>
        <div v-else class="characters-grid">
          <CharacterCard
            v-for="character in partyCharacters"
            :key="character.id"
            :character="character"
            @edit="handleEditCharacter"
            @delete="handleDeleteCharacter"
          />
        </div>
        <div class="link-characters">
          <h3>Link Existing Character</h3>
          <div v-if="availableCharacters.length === 0" class="empty-state">
            <p>No available characters to link.</p>
          </div>
          <div v-else class="available-characters-grid">
            <CharacterCard
              v-for="character in availableCharacters"
              :key="character.id"
              :character="character"
              @edit="handleEditCharacter"
              @delete="() => handleLinkCharacter(character)"
            />
          </div>
        </div>
        <CharacterEditor
          :isOpen="showCharacterEditor"
          :character="editingCharacter"
          :party-id="party.id"
          @submit="handleCharacterSubmit"
          @cancel="handleCharacterCancel"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.party-view {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}
.header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
}
.character-count {
  font-weight: bold;
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.delete-btn {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.delete-btn:hover {
  background: #d32f2f;
}
.content-section {
  margin-top: 2rem;
}
.add-btn {
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
}
.add-btn:hover {
  background: #1976d2;
}
.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
.link-characters {
  margin-top: 2rem;
}
.available-characters-grid {
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
