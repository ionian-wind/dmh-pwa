<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useCharacterStore } from '@/stores/characters';
import BaseListView from '@/components/common/BaseListView.vue';
import StatCard from '@/components/StatCard.vue';

const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const characterStore = useCharacterStore();
const router = useRouter();
const { t, locale } = useI18n();

const stats = computed(() => ({
  notes: noteStore.filtered.length,
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
    title: t('home.stats.notes'),
    count: stats.value.notes,
    icon: '📜',
    route: '/notes'
  },
  {
    id: 'parties',
    key: 'parties',
    title: t('home.stats.parties'),
    count: stats.value.parties,
    icon: '👥',
    route: '/parties'
  },
  {
    id: 'monsters',
    key: 'monsters',
    title: t('home.stats.monsters'),
    count: stats.value.monsters,
    icon: '🐉',
    route: '/monsters'
  },
  {
    id: 'encounters',
    key: 'encounters',
    title: t('home.stats.encounters'),
    count: stats.value.encounters,
    icon: '⚔️',
    route: '/encounters'
  },
  {
    id: 'characters',
    key: 'characters',
    title: t('home.stats.characters'),
    count: stats.value.characters,
    icon: '🧙🏻‍♂️',
    route: '/characters'
  },
  {
    id: 'modules',
    key: 'modules',
    title: t('home.stats.modules'),
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
</style>
