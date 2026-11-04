<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { Party } from '@/types';

import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import { useCharacterStore } from '@/stores/characters';

import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import type { MapEntityRef } from '@/maps/types';

import PartyEditor from '@/parties/PartyEditor.vue';
import { confirm } from '@/dialogs';

const route = useRoute();
const router = useRouter();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const characterStore = useCharacterStore();
const { t } = useI18n();

const showEditor = ref(false);
const activeTab = ref('main');
const tabs = useEntityViewTabs();

const isLoaded = computed(() => partyStore.isLoaded);
const party = computed(() => partyStore.getById(route.params.id as string));
const loading = computed(() => !isLoaded.value);
const notFound = computed(() => isLoaded.value && !party.value);

const modules = computed(() => {
  return (
    party.value?.moduleIds
      ?.map((id) => moduleStore.getById(id))
      .filter(Boolean) || []
  );
});

const partyCharacters = computed(() => {
  const p = party.value;
  if (!p) return [];
  return characterStore.items.filter((c) => p.characters.includes(c.id));
});

const partyLinks = computed<MapEntityRef[]>(() => {
  const p = party.value;
  if (!p) return [];
  return [
    ...(p.moduleIds ?? []).map((id) => ({ kind: 'module' as const, id })),
    ...(p.characters ?? []).map((id) => ({ kind: 'character' as const, id })),
  ];
});

async function handleDeleteParty() {
  if (
    party.value &&
    (await confirm(t('common.confirmDelete', { title: party.value.name })))
  ) {
    await partyStore.remove(party.value.id);
    return true;
  }
  return false;
}

const handleSaveParty = async (
  updatedParty: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  if (!party.value) return;
  await partyStore.update(party.value.id, updatedParty);
  showEditor.value = false;
};

const handlePartyCancel = () => {
  showEditor.value = false;
};

// Computed properties for BaseEntityView
const partyTitle = computed(() => party.value?.name || '');
const partySubtitle = computed(() => {
  if (!party.value) return '';

  const parts = [];
  if (modules.value.length > 0) {
    parts.push(
      `Modules: ${modules.value
        .map((m) => m?.name)
        .filter(Boolean)
        .join(', ')}`,
    );
  }
  parts.push(`${partyCharacters.value.length} characters`);

  return parts.join(' • ');
});
onMounted(async () => {
  await Promise.all([
    partyStore.load(),
    characterStore.load(),
    moduleStore.load(),
  ]);
});

async function handleEditorDelete() {
  if (await handleDeleteParty()) {
    showEditor.value = false;
    await router.push('/parties');
  }
}
</script>

<template>
  <BaseEntityTabView
    :entity="party"
    entity-name="parties.title"
    list-route="/parties"
    :on-delete="handleDeleteParty"
    :on-edit="() => (showEditor = true)"
    :is-editing="showEditor"
    :title="partyTitle"
    :subtitle="partySubtitle"
    :not-found="notFound"
    :loading="loading"
    :tabs="tabs"
    v-model="activeTab"
  >
    <template #main>
      <div v-if="party" class="q-pa-md q-gutter-md">
        <p v-if="party.description" class="text-body1">
          {{ party.description }}
        </p>
      </div>
    </template>

    <template #links>
      <EntityViewLinks :links="partyLinks" />
    </template>

    <template #editor>
      <PartyEditor
        :party="party"
        :isOpen="showEditor"
        @submit="handleSaveParty"
        @delete="handleEditorDelete"
        @cancel="handlePartyCancel"
      />
    </template>
  </BaseEntityTabView>
</template>

<style scoped>
/* Removed .content-section, .section-header, .empty-state, .characters-grid. Use Quasar classes. */
</style>
