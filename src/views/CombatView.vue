<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import type { Combat } from '@/types';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import CombatTracker from '@/components/CombatTracker.vue';
import Button from '@/components/common/Button.vue';
import Mentions from '@/components/common/Mentions.vue';
import { createIndexationStore } from '@/stores/createIndexationStore';

const route = useRoute();
const router = useRouter();
const combatStore = useCombatStore();
const encounterStore = useEncounterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();

const combat = ref<Combat | null>(null);
const notFound = ref(false);

// Combat mention indexation store
const useCombatEntityIndexationStore = createIndexationStore('combatEntityIndexation');
const combatEntityIndexation = useCombatEntityIndexationStore();

onMounted(async () => {
  const combatId = route.params.id as string;
  await Promise.all([
    combatStore.loadCombats(),
    encounterStore.loadEncounters(),
    partyStore.loadParties(),
    moduleStore.loadModules()
  ]);
  
  combat.value = combatStore.getCombatById(combatId);
  if (!combat.value) {
    notFound.value = true;
  }
});

const handleDelete = async () => {
  if (!combat.value) return;
  if (confirm(`Are you sure you want to delete this combat?`)) {
    await combatStore.deleteCombat(combat.value.id);
    router.push('/encounters');
  }
};

const getEncounterName = (encounterId: string) => {
  const encounter = encounterStore.getEncounterById(encounterId);
  return encounter ? encounter.name : 'Unknown Encounter';
};

const getPartyName = (partyId: string) => {
  const party = partyStore.getPartyById(partyId);
  return party ? party.name : 'Unknown Party';
};

const getModuleName = (moduleId: string | null) => {
  if (!moduleId) return 'No Module';
  const module = moduleStore.modules.find(m => m.id === moduleId);
  return module ? module.name : 'Unknown Module';
};

// Computed properties for BaseEntityView
const combatTitle = computed(() => {
  if (!combat.value) return '';
  return `${getEncounterName(combat.value.encounterId)} vs ${getPartyName(combat.value.partyId)}`;
});

const combatSubtitle = computed(() => {
  if (!combat.value) return '';
  
  const parts = [
    `Status: ${combat.value.status}`,
    `Round ${combat.value.currentRound}`,
    `Turn ${combat.value.currentTurn + 1}`,
    `${combat.value.combatants.length} combatants`
  ];
  
  return parts.join(' • ');
});

const startCombat = () => {
  if (!combat.value) return;
  combatStore.startCombat(combat.value.id);
};

const endCombat = () => {
  if (!combat.value) return;
  combatStore.endCombat(combat.value.id);
};

const resetCombat = () => {
  if (!combat.value) return;
  combatStore.resetCombat(combat.value.id);
};

const mentionedEntities = computed(() => {
  if (!combat.value) return [];
  return combatEntityIndexation.getLinks({ kind: 'combat', id: combat.value.id });
});
const mentionedInEntities = computed(() => {
  if (!combat.value) return [];
  return combatEntityIndexation.getBacklinks({ kind: 'combat', id: combat.value.id });
});
</script>

<template>
  <div class="combat-view-container" style="display: flex; flex-direction: row; gap: 2rem; align-items: flex-start;">
    <div style="flex: 2 1 0; min-width: 0;">
      <BaseEntityView
        :entity="combat"
        entity-name="Combat"
        list-route="/encounters"
        :on-delete="handleDelete"
        :title="combatTitle"
        :subtitle="combatSubtitle"
        :not-found="notFound"
      >
        <!-- Combat Content -->
        <div v-if="combat" class="combat-content">
          <div class="combat-header">
            <div class="combat-info">
              <div class="info-section">
                <h3>Encounter</h3>
                <p>{{ getEncounterName(combat.encounterId) }}</p>
              </div>
              <div class="info-section">
                <h3>Party</h3>
                <p>{{ getPartyName(combat.partyId) }}</p>
              </div>
              <div class="info-section">
                <h3>Status</h3>
                <span class="status-badge" :class="combat.status">{{ combat.status }}</span>
              </div>
            </div>
            <div class="combat-controls">
              <Button 
                v-if="combat.status === 'preparing'"
                variant="primary"
                @click="startCombat"
                class="start-btn"
              >
                🚀 Start Combat
              </Button>
              <Button 
                v-if="combat.status === 'active'"
                variant="warning"
                @click="resetCombat"
                class="reset-btn"
              >
                🔄 Reset Combat
              </Button>
              <Button 
                v-if="combat.status === 'active'"
                variant="danger"
                @click="endCombat"
                class="end-btn"
              >
                🏁 End Combat
              </Button>
            </div>
          </div>
          <!-- Combat Tracker -->
          <div class="combat-tracker-section">
            <h3>Combat Tracker</h3>
            <CombatTracker :encounterId="combat.encounterId" />
          </div>
          <!-- Combat Summary -->
          <div class="combat-summary" v-if="combat.status === 'active'">
            <h3>Combat Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <label>Round:</label>
                <span class="summary-value">{{ combat.currentRound }}</span>
              </div>
              <div class="summary-item">
                <label>Turn:</label>
                <span class="summary-value">{{ combat.currentTurn + 1 }} of {{ combat.combatants.length }}</span>
              </div>
              <div class="summary-item">
                <label>Active Combatants:</label>
                <span class="summary-value">{{ combat.combatants.filter(c => c.hitPoints.current > 0).length }}</span>
              </div>
              <div class="summary-item">
                <label>Downed Combatants:</label>
                <span class="summary-value">{{ combat.combatants.filter(c => c.hitPoints.current <= 0).length }}</span>
              </div>
            </div>
          </div>
          <div v-if="combat.notes" class="content-section">
            <h3>Notes</h3>
            <p class="notes">{{ combat.notes }}</p>
          </div>
        </div>
      </BaseEntityView>
    </div>
    <aside style="flex: 1 1 250px; min-width: 200px; max-width: 320px; display: flex; flex-direction: column; gap: 2rem;">
      <Mentions title="Mentions" :entities="mentionedEntities" />
      <Mentions title="Mentioned In" :entities="mentionedInEntities" />
    </aside>
  </div>
</template>

<style scoped>
.combat-content {
  display: grid;
  gap: 2rem;
}

.combat-header {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.combat-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-section h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1rem;
}

.info-section p {
  margin: 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.preparing {
  background: var(--color-warning);
  color: white;
}

.status-badge.active {
  background: var(--color-success);
  color: white;
}

.status-badge.completed {
  background: var(--color-primary);
  color: white;
}

.combat-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.combat-tracker-section {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.combat-tracker-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.combat-summary {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.combat-summary h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: var(--border-radius);
}

.summary-item label {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.summary-value {
  color: var(--color-text);
  font-weight: 500;
  font-size: 1rem;
}

.content-section {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.content-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
  font-size: 1.3rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
}

.notes {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
}

.start-btn {
  background: var(--color-success);
  color: white;
}

.start-btn:hover {
  background: var(--color-success-dark);
}

.reset-btn {
  background: var(--color-warning);
  color: white;
}

.reset-btn:hover {
  background: var(--color-warning-dark);
}

.end-btn {
  background: var(--color-danger);
  color: white;
}

.end-btn:hover {
  background: var(--color-danger-dark);
}
</style> 
