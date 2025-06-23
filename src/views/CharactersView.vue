<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import CharacterCard from '@/components/CharacterCard.vue';
import CharacterEditor from '@/components/CharacterEditor.vue';
import Button from '@/components/common/Button.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import type { PlayerCharacter } from '@/types';

const characterStore = useCharacterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const router = useRouter();

const showEditor = ref(false);
const editingCharacter = ref<PlayerCharacter | null>(null);

onMounted(async () => {
  await Promise.all([
    characterStore.load(),
    partyStore.load(),
    moduleStore.load()
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
    await characterStore.create(character);
  }
  showEditor.value = false;
};

const handleDelete = async (character: PlayerCharacter) => {
  if (character.id && confirm(`Are you sure you want to delete ${character.name}?`)) {
    await characterStore.remove(character.id);
  }
};

const handleCancel = () => {
  showEditor.value = false;
};


</script>

<template>
  <div class="view-root">
    <ViewHeader
      show-create
      create-title="Create Character"
      @create="handleCreateClick"
    />
    <div class="view-list">
      <div v-if="characterStore.filtered.length === 0" class="view-empty">
        <p>No characters yet. Create your first character to get started!</p>
      </div>

      <div v-else class="view-grid">
        <CharacterCard
          v-for="character in characterStore.filtered"
          :key="character.id"
          :character="character"
          @view="() => router.push(`/characters/${character.id}`)"
          @edit="() => handleEditClick(character)"
          @delete="() => handleDelete(character)"
        />
      </div>

      <CharacterEditor
        v-if="showEditor"
        :character="editingCharacter"
        :is-open="showEditor"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>
