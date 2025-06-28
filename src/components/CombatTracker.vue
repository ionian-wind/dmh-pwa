<script setup lang="ts">
import {computed, ref, watch, onMounted, markRaw} from 'vue';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import type { Combatant } from '@/types';
import Button from '@/components/common/Button.vue';
import { useI18n } from 'vue-i18n';

const combatStore = useCombatStore();
const encounterStore = useEncounterStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const { t } = useI18n();

const props = defineProps<{
  encounterId: string;
}>();

const encounter = computed(() => {
  return encounterStore.items.find(e => e.id === props.encounterId);
});

const combat = computed(() => {
  return combatStore.items.find(c => c.encounterId === props.encounterId);
});

const currentCombatant = computed(() => {
  if (!combat.value || combat.value.combatants.length === 0) return null;
    return combat.value.combatants[combat.value.currentTurn];
});

// Combat log functionality
const combatLog = ref<Array<{ id: string; timestamp: number; message: string; type: 'info' | 'action' | 'damage' | 'heal' }>>([]);
const autoAdvance = ref(false);

const addLogEntry = (message: string, type: 'info' | 'action' | 'damage' | 'heal' = 'info') => {
  combatLog.value.unshift({
    id: Date.now().toString(),
    timestamp: Date.now(),
    message,
    type
  });
  
  // Keep only last 50 entries
  if (combatLog.value.length > 50) {
    combatLog.value = combatLog.value.slice(0, 50);
  }
};

const nextTurn = () => {
  if (!combat.value) return;
    combatStore.nextTurn(combat.value.id);
};

const previousTurn = () => {
  if (!combat.value) return;
    combatStore.previousTurn(combat.value.id);
};

const endCombat = () => {
  if (!combat.value) return;
    combatStore.endCombat(combat.value.id);
};

const clearLog = () => {
  combatLog.value = [];
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// Функция для получения деталей комбатанта
const combatantDetails = (combatant: Combatant) => {
  if (combatant.type === 'monster' && combatant.referenceId) {
    return monsterStore.items.find(m => m.id === combatant.referenceId);
  } else if (combatant.type === 'player' && combatant.referenceId && combat.value) {
    const party = partyStore.items.find(p => p.id === combat.value!.partyId);
    if (party && Array.isArray(party.characters)) {
      return party.characters.find(c => c === combatant.referenceId);
    }
  }
  return null;
};

// Watch for combat state changes
watch(() => combat.value?.currentTurn, (newTurn, oldTurn) => {
  if (newTurn !== undefined && oldTurn !== undefined && combat.value) {
    const combatant = combat.value.combatants[newTurn];
    if (combatant) {
      addLogEntry(`${combatant.name}'s turn`, 'action');
    }
  }
});

watch(() => combat.value?.currentRound, (newRound, oldRound) => {
  if (newRound !== undefined && oldRound !== undefined && newRound !== oldRound) {
    addLogEntry(`Round ${newRound} begins!`, 'info');
  }
});

onMounted(async () => {
  await combatStore.load();
  await encounterStore.load();
  await partyStore.load();
  await monsterStore.load();
  if (combat.value) {
    addLogEntry(`Loaded combat for encounter: ${encounter.value?.name}`, 'info');
  }
});

const getCombatantName = (combatantId: string) => {
  if (!combat.value) return '';
  const combatant = combat.value.combatants.find(c => c.id === combatantId);
  if (!combatant) return '';
  if (combatant.type === 'monster') {
    const monster = monsterStore.items.find(m => m.id === combatant.referenceId);
    return monster ? monster.name : combatant.name;
  } else {
    const party = partyStore.items.find(p => p.id === combat.value!.partyId);
    if (party) {
      const character = party.characters.find(c => c === combatant.referenceId);
      return character ? character : combatant.name;
    }
    return combatant.name;
  }
};
</script>

<template>
  <div v-if="encounter && combat" class="combat-tracker">
    <div class="header">
      <h2>{{ encounter.name }} - Round {{ combat.currentRound }}</h2>
    </div>

    <div class="current-turn" v-if="currentCombatant">
      <h3>Current Turn: {{ currentCombatant.name }}</h3>
      <div class="combatant-details">
        <p>Type: {{ currentCombatant.type }}</p>
      </div>
    </div>

    <div class="initiative-list">
      <div v-for="(combatant, index) in combat.combatants"
           :key="combatant.id"
           class="initiative-item"
           :class="{ 
             'current': index === combat.currentTurn,
             'player': combatant.type === 'player',
             'monster': combatant.type === 'monster'
           }">
        <span class="order">{{ index + 1 }}.</span>
        <span class="name">{{ combatant.name }}</span>
      </div>
    </div>

    <!-- Combat Log -->
    <div class="combat-log" v-if="combatLog.length > 0">
      <h3>Combat Log</h3>
      <div class="log-entries">
        <div 
          v-for="entry in combatLog" 
          :key="entry.id" 
          class="log-entry"
          :class="entry.type"
        >
          <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
          <span class="log-message">{{ entry.message }}</span>
        </div>
      </div>
      <Button variant="secondary" size="small" @click="clearLog" :title="t('common.clearLog')">
        <i class="si si-trash"></i> <span>Clear Log</span>
      </Button>
    </div>
  </div>
  <div v-else class="no-combat">
    <p>No active combat found for this encounter.</p>
  </div>
</template>

<style scoped>
.combat-tracker {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.current-turn {
  background-color: var(--color-info-light);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.hp-controls {
  margin: 0.5rem 0;
}

.initiative-item {
  display: flex;
  padding: 8px;
  border-bottom: 1px solid var(--color-border-light);
  align-items: center;
}

.initiative-item.current {
  background-color: var(--color-warning-light);
  font-weight: bold;
}

.player { background-color: var(--color-success-light); }
.monster { background-color: var(--color-danger-light); }

.order { width: 30px; }
.name { flex: 2; }

.action-buttons .si {
  margin-right: 0.5em;
}

.controls .si {
  vertical-align: middle;
}

.combat-log {
  background: var(--color-info-light);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.combat-log h3 {
  margin: 0 0 1rem 0;
  color: var(--color-info-dark);
}

.log-entries {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.log-entry {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-radius: var(--border-radius);
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.log-entry.info {
  background: var(--color-info-light);
  color: var(--color-info-dark);
}

.log-entry.action {
  background: var(--color-warning-light);
  color: var(--color-warning-dark);
}

.log-entry.damage {
  background: var(--color-danger-light);
  color: var(--color-danger-dark);
}

.log-entry.heal {
  background: var(--color-success-light);
  color: var(--color-success-dark);
}

.log-time {
  font-weight: 500;
  min-width: 80px;
}

.log-message {
  flex: 1;
}
</style>
