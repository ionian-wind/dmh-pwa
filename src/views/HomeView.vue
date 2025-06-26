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
      <!-- i18n Test Section -->
      <div class="i18n-test">
        <h3>i18n Test</h3>
        <p>Current locale: {{ locale }}</p>
        <p>App title: {{ t('app.title') }}</p>
        <p>Navigation home: {{ t('navigation.home') }}</p>
        <p>Common empty: {{ t('common.empty') }}</p>
      </div>
      
      <div class="stats-grid">
        <router-link to="/notes" class="stat-card" exact>
          <div class="stat-icon">📜</div>
          <div class="stat-content">
            <h3>{{ t('home.stats.notes') }}</h3>
            <p>{{ stats.notes }} {{ t('home.stats.notes').toLowerCase() }}</p>
          </div>
        </router-link>

        <router-link to="/parties" class="stat-card" exact>
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3>{{ t('home.stats.parties') }}</h3>
            <p>{{ stats.parties }} {{ t('home.stats.parties').toLowerCase() }}</p>
          </div>
        </router-link>

        <router-link to="/monsters" class="stat-card" exact>
          <div class="stat-icon">🐉</div>
          <div class="stat-content">
            <h3>{{ t('home.stats.monsters') }}</h3>
            <p>{{ stats.monsters }} {{ t('home.stats.monsters').toLowerCase() }}</p>
          </div>
        </router-link>

        <router-link to="/encounters" class="stat-card" exact>
          <div class="stat-icon">⚔️</div>
          <div class="stat-content">
            <h3>{{ t('home.stats.encounters') }}</h3>
            <p>{{ stats.encounters }} {{ t('home.stats.encounters').toLowerCase() }}</p>
          </div>
        </router-link>

        <router-link to="/characters" class="stat-card" exact>
          <div class="stat-icon">🧙🏻‍♂️</div>
          <div class="stat-content">
            <h3>{{ t('home.stats.characters') }}</h3>
            <p>{{ stats.characters }} {{ t('home.stats.characters').toLowerCase() }}</p>
          </div>
        </router-link>

        <router-link to="/modules" class="stat-card" exact>
          <div class="stat-icon">📖</div>
          <div class="stat-content">
            <h3>{{ t('home.stats.modules') }}</h3>
            <p>{{ stats.modules }} {{ t('home.stats.modules').toLowerCase() }}</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.content {
  margin-top: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border-color: var(--color-info);
}

.stat-icon {
  font-size: 2rem;
  background: var(--color-background-soft);
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.stat-content h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}

.stat-content p {
  margin: 0.5rem 0 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}
</style>
