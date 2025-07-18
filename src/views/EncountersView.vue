<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useEncounterStore } from '@/stores/encounters';
import { useModuleStore } from '@/stores/modules';
import type { Encounter, Combat } from '@/types';
import BaseListView from '@/components/common/BaseListView.vue';
import EncounterCard from '@/components/EncounterCard.vue';
import EncounterEditor from '@/components/EncounterEditor.vue';
import PartySelector from '@/components/PartySelector.vue';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const encounterStore = useEncounterStore();
const moduleStore = useModuleStore();
const { t } = useI18n();

const showPartySelector = ref(false);
const selectedEncounterForCombat = ref<Encounter | null>(null);

onMounted(async () => {
  await Promise.all([
    encounterStore.load(),
    moduleStore.load()
  ]);
});

function cardProps(encounter: Encounter) {
  return {
    encounter,
    onView: () => router.push(`/encounters/${encounter.id}`),
    onEdit: () => handleEdit(encounter),
    onDelete: () => handleDelete(encounter),
    onRunCombat: () => handleRunCombat(encounter)
  };
}

function editorProps(encounter: Encounter | null) {
  return {
    encounter,
    isOpen: true
  };
}

function handleEdit(encounter: Encounter) {
  // handled by BaseListView
}
function handleDelete(encounter: Encounter) {
  if (confirm(`Are you sure you want to delete ${encounter.name}?`)) {
    encounterStore.remove(encounter.id);
  }
}
function handleSubmit(encounter: Encounter) {
  if (encounter.id) {
    encounterStore.update(encounter.id, encounter);
  } else {
    encounterStore.create(encounter);
  }
}
function handleRunCombat(encounter: Encounter) {
  selectedEncounterForCombat.value = encounter;
  showPartySelector.value = true;
}
function handleCombatCreated(combat: Combat) {
  showPartySelector.value = false;
  selectedEncounterForCombat.value = null;
  router.push(`/combats/${combat.id}`);
}
function handlePartySelectorCancel() {
  showPartySelector.value = false;
  selectedEncounterForCombat.value = null;
}
async function handleCopy(encounter: Encounter) {
  const { id, createdAt, updatedAt, ...rest } = encounter;
  await encounterStore.create(rest);
}
</script>

<template>
  <div>
    <BaseListView
    :items="encounterStore.filtered"
    :card-component="EncounterCard"
    :editor-component="EncounterEditor"
    :empty-message="t('common.emptyEncounters')"
    :create-title="t('encounters.create')"
    :card-props="cardProps"
    :editor-props="editorProps"
    @delete="handleDelete"
    @submit="handleSubmit"
    @view="(encounter) => router.push(`/encounters/${encounter.id}`)"
    @run-combat="handleRunCombat"
    @copy="handleCopy"
  />
  <PartySelector
    :is-open="showPartySelector"
    :encounter="selectedEncounterForCombat"
    @cancel="handlePartySelectorCancel"
    @combat-created="handleCombatCreated"
  />
  </div>
</template>
