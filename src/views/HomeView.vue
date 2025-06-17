<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useCharacterStore } from '@/stores/characters';
import GlobalMenu from '@/components/GlobalMenu.vue';

const router = useRouter();
const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const characterStore = useCharacterStore();

const stats = computed(() => {
  const moduleId = moduleStore.currentModuleId;
  return {
    notes: moduleId ? noteStore.notes.filter(note => note.moduleId === moduleId).length : noteStore.notes.length,
    parties: moduleId ? partyStore.parties.filter(party => party.moduleId === moduleId).length : partyStore.parties.length,
    monsters: moduleId ? monsterStore.monsters.filter(monster => monster.moduleId === moduleId).length : monsterStore.monsters.length,
    encounters: moduleId ? encounterStore.encounters.filter(encounter => encounter.moduleId === moduleId).length : encounterStore.encounters.length,
    characters: moduleId ? characterStore.all.filter(character => character.moduleId === moduleId).length : characterStore.all.length,
    modules: moduleStore.modules.length
  };
});

onMounted(async () => {
  await Promise.all([
    noteStore.loadNotes(),
    partyStore.loadParties(),
    monsterStore.loadMonsters(),
    encounterStore.loadEncounters(),
    moduleStore.loadModules()
  ]);
});
</script>

<template>
  <div class="home-view">    
    <div class="content">
      <div class="stats-grid">
        <router-link to="/notes" class="stat-card" exact>
          <div class="stat-icon">📜</div>
          <div class="stat-content">
            <h3>Notes</h3>
            <p>{{ stats.notes }} notes</p>
          </div>
        </router-link>

        <router-link to="/parties" class="stat-card" exact>
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3>Parties</h3>
            <p>{{ stats.parties }} parties</p>
          </div>
        </router-link>

        <router-link to="/monsters" class="stat-card" exact>
          <div class="stat-icon">🐉</div>
          <div class="stat-content">
            <h3>Monsters</h3>
            <p>{{ stats.monsters }} monsters</p>
          </div>
        </router-link>

        <router-link to="/encounters" class="stat-card" exact>
          <div class="stat-icon">⚔️</div>
          <div class="stat-content">
            <h3>Encounters</h3>
            <p>{{ stats.encounters }} encounters</p>
          </div>
        </router-link>

        <router-link to="/characters" class="stat-card" exact>
          <div class="stat-icon">🧙🏻‍♂️</div>
          <div class="stat-content">
            <h3>Characters</h3>
            <p>{{ stats.characters }} characters</p>
          </div>
        </router-link>

        <router-link to="/modules" class="stat-card" exact>
          <div class="stat-icon">📖</div>
          <div class="stat-content">
            <h3>Modules</h3>
            <p>{{ stats.modules }} modules</p>
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
  background: white;
  border: 1px solid #ddd;
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
  border-color: #2196f3;
}

.stat-icon {
  font-size: 2rem;
  background: #f5f5f5;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.stat-content h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.stat-content p {
  margin: 0.5rem 0 0;
  color: #666;
  font-size: 0.9rem;
}
</style>
