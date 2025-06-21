<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import type { Combat, Combatant } from '@/types';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import CombatTracker from '@/components/CombatTracker.vue';
import Button from '@/components/common/Button.vue';
import NotFoundView from './NotFoundView.vue';

const route = useRoute();
const router = useRouter();
const combatStore = useCombatStore();
const encounterStore = useEncounterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();

const combat = ref<Combat | null>(null);
const loading = computed(() => !combatStore.isLoaded);
const notFound = computed(() => combatStore.isLoaded && !combat.value);

function updateCombatFromStore() {
  if (!combatStore.isLoaded) {
    return;
  }
  const combatId = route.params.id as string;
  const found = combatStore.getById(combatId);
  if (found) {
    combat.value = found;
  } else {
    router.push('/combats');
  }
}

watch([
  () => combatStore.items,
  () => combatStore.isLoaded
], updateCombatFromStore, { immediate: true });

const handleDelete = async () => {
  if (!combat.value) return;
  await combatStore.remove(combat.value.id);
  router.push('/combats');
};

const getEncounterName = (encounterId: string) => {
  const encounter = encounterStore.getById(encounterId);
  return encounter ? encounter.name : 'Unknown Encounter';
};

const getPartyName = (partyId: string) => {
  const party = partyStore.getById(partyId);
  return party ? party.name : 'Unknown Party';
};

const getModuleName = (moduleId: string | null) => {
  if (!moduleId) return 'No Module';
  const module = moduleStore.items.find(m => m.id === moduleId);
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

onMounted(async () => {
  combatStore.load();
});
</script>

<template>
  <div class="view-container" style="display: flex; flex-direction: row; gap: 2rem; align-items: flex-start;">
    <div style="flex: 2 1 0; min-width: 0;">
      <div v-if="loading" class="loading-state">Loading...</div>
      <NotFoundView v-else-if="notFound" />
      <BaseEntityView
        v-else
        :entity="combat"
        entity-name="Combat"
        list-route="/combats"
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
                <i class="si si-player-play"></i> Start Combat
              </Button>
              <Button 
                v-if="combat.status === 'active'"
                variant="warning"
                @click="resetCombat"
                class="reset-btn"
              >
                <i class="si si-refresh"></i> Reset Combat
              </Button>
              <Button 
                v-if="combat.status === 'active'"
                variant="danger"
                @click="endCombat"
                class="end-btn"
              >
                <i class="si si-close"></i> End Combat
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
                <span class="summary-value">{{ combat.combatants.filter((c: Combatant) => c.hitPoints.current > 0).length }}</span>
              </div>
              <div class="summary-item">
                <label>Downed Combatants:</label>
                <span class="summary-value">{{ combat.combatants.filter((c: Combatant) => c.hitPoints.current <= 0).length }}</span>
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

.combat-controls .si {
  margin-right: 0.5em;
  vertical-align: middle;
}
</style> 
