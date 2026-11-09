<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCharacterStore } from '@/stores/characters';
import { usePartyStore } from '@/stores/parties';
import { useSelectedParty } from '@/parties/useSelectedParty';
import { useRightDrawer } from '@/composables/useLayout';
import BaseListView from '@/components/common/BaseListView.vue';
import CharacterCard from '@/characters/CharacterCard.vue';
import CharacterEditor from '@/characters/CharacterEditor.vue';
import PartyList from '@/parties/PartyList.vue';
import type { PlayerCharacter } from '@/types';
import { useI18n } from 'vue-i18n';
import { confirm } from '@/dialogs';
import { deleteFileIfUnreferenced } from '@/utils/files';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import { IconUsers } from '@tabler/icons-vue';

const characterStore = useCharacterStore();
const partyStore = usePartyStore();
const router = useRouter();
const rightDrawer = useRightDrawer();
const relations = useEntityLinkRelations();
const { selectedPartyId, selectedParty, selectedCharacterIds, clearSelection } =
  useSelectedParty();
const { t } = useI18n();

const visibleCharacters = computed(() => {
  if (!selectedParty.value) return characterStore.filtered;
  return characterStore.filtered.filter((character) =>
    selectedCharacterIds.value.has(character.id),
  );
});

onMounted(async () => {
  await Promise.all([characterStore.load(), partyStore.load()]);
  rightDrawer.set({ component: PartyList });
});

onBeforeUnmount(() => {
  rightDrawer.clear();
  clearSelection();
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
    // Seed a new character's linking tab with the party currently filtering
    // the list. The editor keeps this in its draft until the record exists.
    partyId: character ? undefined : (selectedPartyId.value ?? undefined),
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

async function handleSubmit(
  character: PlayerCharacter,
  meta?: { linkedPartyIds?: string[] },
) {
  const previousPicture = character.id
    ? (characterStore.getById(character.id)?.picture ?? '')
    : '';
  if (character.id) {
    await characterStore.update(character.id, character);
  } else {
    const created = await characterStore.create(character);
    const partyIds = meta?.linkedPartyIds ?? [];
    if (partyIds.length) {
      await relations.setLinkedIds('character', created.id, 'party', partyIds);
    }
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
    :items="visibleCharacters"
    :card-component="CharacterCard"
    :editor-component="CharacterEditor"
    :empty-message="t('common.emptyCharacters')"
    :create-title="t('characters.create')"
    :right-drawer-icon="IconUsers"
    :card-props="cardProps"
    :editor-props="editorProps"
    @submit="handleSubmit"
    @delete="handleDelete"
    @copy="handleCopy"
  />
</template>
