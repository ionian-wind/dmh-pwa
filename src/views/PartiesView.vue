<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePartyStore } from '@/stores/parties';
import BaseListView from '@/components/common/BaseListView.vue';
import PartyCard from '@/components/PartyCard.vue';
import PartyEditor from '@/components/PartyEditor.vue';
import type { Party } from '@/types';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const partyStore = usePartyStore();
const { t } = useI18n();

onMounted(async () => {
  await partyStore.load();
});

function cardProps(party: Party) {
  return {
    party,
    onView: () => router.push(`/parties/${party.id}`),
    onEdit: () => handleEdit(party),
    onDelete: () => handleDelete(party)
  };
}

function editorProps(party: Party | null) {
  return {
    party,
    isOpen: true
  };
}

function handleEdit(party: Party) {
  // handled by BaseListView
}

function handleDelete(party: Party) {
  if (confirm(`Are you sure you want to delete ${party.name}?`)) {
    partyStore.remove(party.id);
  }
}

function handleSubmit(party: Party) {
  if (party.id) {
    partyStore.update(party.id, party);
  } else {
    partyStore.create(party);
  }
}

async function handleCopy(party: Party) {
  const { id, createdAt, updatedAt, ...rest } = party;
  await partyStore.create(rest);
}
</script>

<template>
  <BaseListView
    :items="partyStore.filtered"
    :card-component="PartyCard"
    :editor-component="PartyEditor"
    :empty-message="t('common.emptyParties')"
    :create-title="t('parties.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @delete="handleDelete"
    @submit="handleSubmit"
    @view="(party) => router.push(`/parties/${party.id}`)"
    @copy="handleCopy"
  />
</template>

