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
import { useI18n } from 'vue-i18n';

const characterStore = useCharacterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const router = useRouter();
const { t } = useI18n();

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

async function handleCopy(character: PlayerCharacter) {
  const { id, createdAt, updatedAt, ...rest } = character;
  await characterStore.create(rest);
}
</script>

<template>
  <BaseListView
    :items="characterStore.filtered"
    :card-component="CharacterCard"
    :editor-component="CharacterEditor"
    :empty-message="t('common.emptyCharacters')"
    :create-title="t('characters.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @delete="handleDelete"
    @submit="handleSubmit"
    @view="(character) => router.push(`/characters/${character.id}`)"
    @copy="handleCopy"
  />
</template>
