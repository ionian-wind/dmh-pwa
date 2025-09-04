<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useCharacterStore } from '@/stores/characters';
import BaseListView from '@/components/common/BaseListView.vue';
import StatCard from '@/components/StatCard.vue';
import { backupAllStores, restoreAllStores } from '@/utils/storage';
import { alert } from '@/dialogs';

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const characterStore = useCharacterStore();

const { t } = useI18n();

const stats = computed(() => ({
  notes: noteStore.items.filter((n) => !n.hidden).length,
  characters: characterStore.items.length,
  parties: partyStore.filtered.length,
  monsters: monsterStore.filtered.length,
  encounters: encounterStore.filtered.length,
  modules: moduleStore.items.length,
}));

const statsCards = computed(() => [
  {
    id: 'notes',
    key: 'notes',
    title: 'home.stats.notes',
    count: stats.value.notes,
    icon: '📜',
    route: '/notes',
  },
  {
    id: 'parties',
    key: 'parties',
    title: 'home.stats.parties',
    count: stats.value.parties,
    icon: '👥',
    route: '/parties',
  },
  {
    id: 'monsters',
    key: 'monsters',
    title: 'home.stats.monsters',
    count: stats.value.monsters,
    icon: '🐉',
    route: '/monsters',
  },
  {
    id: 'encounters',
    key: 'encounters',
    title: 'home.stats.encounters',
    count: stats.value.encounters,
    icon: '⚔️',
    route: '/encounters',
  },
  {
    id: 'characters',
    key: 'characters',
    title: 'home.stats.characters',
    count: stats.value.characters,
    icon: '🧙🏻‍♂️',
    route: '/characters',
  },
  {
    id: 'modules',
    key: 'modules',
    title: 'home.stats.modules',
    count: stats.value.modules,
    icon: '📖',
    route: '/modules',
  },
]);

onMounted(async () => {
  await Promise.all([
    noteStore.load(),
    characterStore.load(),
    partyStore.load(),
    monsterStore.load(),
    encounterStore.load(),
    moduleStore.load(),
  ]);
});

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

async function handleBackup() {
  try {
    const blob = await backupAllStores();
    downloadBlob(
      blob,
      `dmh-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`,
    );
    await alert(t('backup.backupCompleted'));
  } catch (e) {
    await alert(t('backup.backupFailed') + (e instanceof Error ? e.message : e));
  }
}

async function handleRestore(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    await restoreAllStores(file);
    await alert(t('backup.restoreCompleted'));
    // Optionally reload stores
    await Promise.all([
      noteStore.load(),
      characterStore.load(),
      partyStore.load(),
      monsterStore.load(),
      encounterStore.load(),
      moduleStore.load(),
    ]);
  } catch (e) {
    await alert(t('backup.restoreFailed') + (e instanceof Error ? e.message : e));
  }
  input.value = '';
}
</script>

<template>
  <div class="q-pa-md q-gutter-md" style="max-width: 1200px; margin: 0 auto">
    <div class="q-pa-xl q-mb-xl text-center">
      <div class="q-mb-md flex flex-center column items-center">
        <img
          src="/dmh-pwa/icon-192.png"
          alt="DMH PWA Icon"
          style="width: 150px; height: 150px"
        />
        <div class="q-mt-md">
          <h1 class="text-h2 text-bold">{{ t('project.name') }}</h1>
          <p class="text-subtitle1 text-grey-7 q-mt-xs">
            {{ t('project.subtitle') }}
          </p>
        </div>
      </div>
    </div>
    <BaseListView
      :items="statsCards"
      :card-component="StatCard"
      :card-props="(item: any) => ({ item })"
      :empty-message="t('common.empty')"
      :create-title="t('common.create')"
      :show-search="false"
      view-style="grid"
      :hide-header="true"
    />
  </div>
</template>

<style scoped>
/* Removed custom layout classes. Use Quasar classes. */
</style>
