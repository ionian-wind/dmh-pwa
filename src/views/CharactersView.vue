<template>
  <div class="view-list">
    <div class="view-header">
      <Button @click="handleCreateClick" title="Create Character">
        <i class="si si-plus"></i>
      </Button>
    </div>

    <div v-if="characterStore.items.length === 0" class="view-empty">
      <p>No characters yet. Create your first character to get started!</p>
    </div>

    <div v-else class="view-grid">
      <div v-for="character in characterStore.items" :key="character.id" class="character-card">
        <CharacterCard
          :character="character"
          @view="(character: PlayerCharacter) => $router.push(`/characters/${character.id}`)"
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
import Button from '@/components/common/Button.vue';
import type { PlayerCharacter } from '@/types';

const router = useRouter();
const characterStore = useCharacterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const showEditor = ref(false);
const editingCharacter = ref<PlayerCharacter | null>(null);

onMounted(async () => {
  await Promise.all([
    characterStore.load(),
    partyStore.load?.(),
    moduleStore.load?.()
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

const handleCancel = () => {
  showEditor.value = false;
};

const deleteCharacter = async (character: PlayerCharacter) => {
  if (confirm(`Are you sure you want to delete ${character.name}?`)) {
    await characterStore.remove(character.id);
  }
};
</script>
