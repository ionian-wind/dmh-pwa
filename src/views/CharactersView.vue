<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import BaseListView from '@/components/common/BaseListView.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import CharacterEditor from '@/components/CharacterEditor.vue';
import type { PlayerCharacter } from '@/types';

const characterStore = useCharacterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const router = useRouter();

onMounted(async () => {
  await Promise.all([
    characterStore.load(),
    partyStore.load(),
    moduleStore.load()
  ]);
});

function cardProps(character: PlayerCharacter) {
  return {
    character,
    onView: () => router.push(`/characters/${character.id}`),
    onEdit: () => handleEdit(character),
    onDelete: () => handleDelete(character)
  };
}

function editorProps(character: PlayerCharacter | null) {
  return {
    character,
    isOpen: true
  };
}

function handleEdit(character: PlayerCharacter) {
  // handled by BaseListView
}

function handleDelete(character: PlayerCharacter) {
  if (character.id && confirm(`Are you sure you want to delete ${character.name}?`)) {
    characterStore.remove(character.id);
  }
}

function handleSubmit(character: PlayerCharacter) {
  if (character.id) {
    characterStore.update(character.id, character);
  } else {
    characterStore.create(character);
  }
}
</script>

<template>
  <BaseListView
    :items="characterStore.filtered"
    :card-component="CharacterCard"
    :editor-component="CharacterEditor"
    :empty-message="'No characters yet. Create your first character to get started!'"
    create-title="Create Character"
    :card-props="cardProps"
    :editor-props="editorProps"
    @delete="handleDelete"
    @submit="handleSubmit"
    @view="(character) => router.push(`/characters/${character.id}`)"
  />
</template>
