<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import BaseListView from '@/components/common/BaseListView.vue';
import CharacterCard from '@/characters/CharacterCard.vue';
import CharacterEditor from '@/characters/CharacterEditor.vue';
import type { PlayerCharacter } from '@/types';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';
import { deleteFileIfUnreferenced } from '@/utils/files';

const characterStore = useCharacterStore();
const router = useRouter();
const { t } = useI18n();

onMounted(async () => {
  await Promise.all([characterStore.load()]);
});

function cardProps(character: PlayerCharacter) {
  return {
    character,
    onView: () => router.push(`/characters/${character.id}`),
    onEdit: () => handleEdit(character),
    onDelete: () => handleDelete(character),
  };
}

function editorProps(character: PlayerCharacter | null) {
  return {
    character,
    isOpen: true,
  };
}

function handleEdit(character: PlayerCharacter) {
  // handled by BaseListView
}

async function handleDelete(character: PlayerCharacter) {
  if (
    character.id &&
    (await confirm(t('common.confirmDelete', { title: character.name })))
  ) {
    const picture = character.picture;
    await characterStore.remove(character.id);
    if (picture) await deleteFileIfUnreferenced(picture);
    return true;
  }
  return false;
}

async function handleSubmit(character: PlayerCharacter) {
  const previousPicture = character.id
    ? (characterStore.getById(character.id)?.picture ?? '')
    : '';
  if (character.id) {
    await characterStore.update(character.id, character);
  } else {
    await characterStore.create(character);
  }
  if (previousPicture && previousPicture !== (character.picture ?? '')) {
    await deleteFileIfUnreferenced(previousPicture);
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
    @submit="handleSubmit"
    @delete="handleDelete"
    @copy="handleCopy"
  />
</template>
