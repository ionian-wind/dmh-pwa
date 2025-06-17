<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import { useCharacterStore } from '@/stores/characters';
import { Party, PlayerCharacter } from '@/types';
import PartyEditor from '@/components/PartyEditor.vue';
import BaseModal from '@/components/BaseModal.vue';
import ToggleSwitch from '@/components/ToggleSwitch.vue';

const route = useRoute();
const router = useRouter();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const characterStore = useCharacterStore();

const showEditor = ref(false);
const showLinkModal = ref(false);
const party = ref<Party | null>(null);

const partyId = route.params.id as string;

const modules = computed(() => {
  if (!party.value) return [];
  const moduleIds = party.value.moduleIds || [];
  return moduleIds
    .map(id => moduleStore.getModuleById(id))
    .filter(m => m !== null);
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

const linkedCharacters = computed(() => {
  const p = party.value;
  if (!p) return {};
  const linked = allCharacters.value.filter(c => c.partyId === p.id).map(c => c.id);
  return allCharacters.value.reduce((acc, character) => {
    acc[character.id] = linked.includes(character.id);
    return acc;
  }, {} as Record<string, boolean>);
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

const handlePartySubmit = async (updatedParty: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!party.value) return;
  await partyStore.updateParty(party.value.id, updatedParty);
  party.value = await partyStore.getPartyById(party.value.id);
  showEditor.value = false;
};

const handlePartyCancel = () => {
  showEditor.value = false;
};

const handleRemoveCharacter = (character: PlayerCharacter) => {
  if (confirm(`Remove character "${character.name}" from this party?`)) {
    characterStore.setParty(character.id, null);
  }
};

const handleToggleCharacter = (character: PlayerCharacter, isLinked: boolean) => {
  if (!party.value) return;
  if (isLinked) {
    characterStore.setParty(character.id, party.value.id);
  } else {
    characterStore.setParty(character.id, null);
  }
};

const isCharacterLinked = (characterId: string) => {
  return linkedCharacters.value[characterId];
};
</script>

<template>
  <div v-if="party">
    <div class="party-view">
      <div class="header">
        <h1>{{ party.name }}</h1>
        <div class="meta">
          <span v-if="modules.length > 0">Modules: {{ modules.map(m => m.name).join(', ') }}</span>
          <span class="character-count">{{ partyCharacters.length }} characters</span>
        </div>
        <div class="actions">
          <button @click="showEditor = true">Edit Party</button>
          <button @click="showLinkModal = true">Link Characters</button>
          <button @click="handleDeleteParty" class="delete-btn">Delete Party</button>
        </div>
      </div>
      <PartyEditor
        :party="party"
        :isOpen="showEditor"
        @submit="handlePartySubmit"
        @cancel="handlePartyCancel"
      />
      <BaseModal
        :isOpen="showLinkModal"
        title="Link Characters"
        :showCancel="true"
        :showSubmit="false"
        cancelLabel="Close"
        @cancel="showLinkModal = false"
      >
        <div v-if="allCharacters.length === 0" class="empty-state">
          <p>No characters available</p>
        </div>
        <div v-else class="characters-grid">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Level</th>
                <th>Class</th>
                <th>Linked</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="character in allCharacters" :key="character.id">
                <td>{{ character.name }}</td>
                <td>{{ character.level }}</td>
                <td>{{ character.class }}</td>
                <td>
                  <ToggleSwitch
                    v-model="linkedCharacters[character.id]"
                    @update:modelValue="(value) => handleToggleCharacter(character, value)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseModal>
      <section class="content-section">
        <h2>Characters</h2>
        <div v-if="partyCharacters.length === 0" class="empty-state">
          <p>No characters in this party yet</p>
        </div>
        <div v-else class="characters-grid">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Level</th>
                <th>Class</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="character in partyCharacters" :key="character.id">
                <td>{{ character.name }}</td>
                <td>{{ character.level }}</td>
                <td>{{ character.class }}</td>
                <td>
                  <button @click="handleToggleCharacter(character, false)">Unlink</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
.characters-grid {
  margin-top: 2rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  overflow: hidden;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th {
  background: var(--color-background);
  font-weight: 600;
  color: var(--color-text);
}

td {
  color: var(--color-text);
}

tr:hover {
  background: var(--color-background);
}

button {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

button:hover {
  background: var(--color-danger);
  color: white;
  border-color: var(--color-danger);
}

.link-btn:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.empty-state {
  color: #888;
  text-align: center;
  margin: 2rem 0;
}
</style>
