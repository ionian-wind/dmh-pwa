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

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const characterStore = useCharacterStore();

const { t } = useI18n();

const stats = computed(() => ({
  notes: noteStore.items.filter(n => !n.hidden).length,
  characters: characterStore.items.length,
  parties: partyStore.filtered.length,
  monsters: monsterStore.filtered.length,
  encounters: encounterStore.filtered.length,
  modules: moduleStore.items.length
}));

const statsCards = computed(() => [
  {
    id: 'notes',
    key: 'notes',
    title: 'home.stats.notes',
    count: stats.value.notes,
    icon: '📜',
    route: '/notes'
  },
  {
    id: 'parties',
    key: 'parties',
    title: 'home.stats.parties',
    count: stats.value.parties,
    icon: '👥',
    route: '/parties'
  },
  {
    id: 'monsters',
    key: 'monsters',
    title: 'home.stats.monsters',
    count: stats.value.monsters,
    icon: '🐉',
    route: '/monsters'
  },
  {
    id: 'encounters',
    key: 'encounters',
    title: 'home.stats.encounters',
    count: stats.value.encounters,
    icon: '⚔️',
    route: '/encounters'
  },
  {
    id: 'characters',
    key: 'characters',
    title: 'home.stats.characters',
    count: stats.value.characters,
    icon: '🧙🏻‍♂️',
    route: '/characters'
  },
  {
    id: 'modules',
    key: 'modules',
    title: 'home.stats.modules',
    count: stats.value.modules,
    icon: '📖',
    route: '/modules'
  }
]);

onMounted(async () => {
  await Promise.all([
    noteStore.load(),
    characterStore.load(),
    partyStore.load(),
    monsterStore.load(),
    encounterStore.load(),
    moduleStore.load()
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
    downloadBlob(blob, `dmh-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`);
    alert(t('backup.backupCompleted'));
  } catch (e) {
    alert(t('backup.backupFailed') + (e instanceof Error ? e.message : e));
  }
}

async function handleRestore(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    await restoreAllStores(file);
    alert(t('backup.restoreCompleted'));
    // Optionally reload stores
    await Promise.all([
      noteStore.load(),
      characterStore.load(),
      partyStore.load(),
      monsterStore.load(),
      encounterStore.load(),
      moduleStore.load()
    ]);
  } catch (e) {
    alert(t('backup.restoreFailed') + (e instanceof Error ? e.message : e));
  }
  input.value = '';
}
</script>

<template>
  <div class="home-view">    
    <div class="content">
      <!-- Project Header Panel -->
      <div class="project-header">
        <div class="project-info">
          <img src="/icon-192.png" alt="DMH PWA Icon" class="project-icon" />
          <div class="project-details">
            <h1 class="project-title">{{ t('project.name') }}</h1>
            <p class="project-subtitle">{{ t('project.subtitle') }}</p>
          </div>
        </div>
        <!-- <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button @click="handleBackup" class="backup-btn">{{ t('backup.backup') }}</button>
          <label class="restore-btn">
            {{ t('backup.restore') }}
            <input type="file" accept=".zip" @change="handleRestore" style="display:none" />
          </label>
        </div> -->
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
  </div>
</template>

<style scoped>
.home-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.project-header {
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
}

.project-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.project-icon {
  width: 150px;
  height: 150px;
}

.project-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.project-title {
  margin: 0;
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--color-text);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.project-subtitle {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text-light);
  font-style: italic;
}

.backup-btn, .restore-btn {
  background: var(--color-primary, #4a90e2);
  color: #fff;
  border: none;
  padding: 0.7rem 1.5rem;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.backup-btn:hover, .restore-btn:hover {
  background: var(--color-primary-dark, #357ab8);
}
.restore-btn input[type="file"] {
  display: none;
}
</style>
