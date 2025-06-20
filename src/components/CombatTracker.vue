<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import type { Combatant } from '@/types';
import Button from '@/components/common/Button.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';;

const props = defineProps<{
  encounterId: string;
}>();

const combatStore = useCombatStore();
const encounterStore = useEncounterStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();

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

const updateHitPoints = (combatantId: string, change: number) => {
  if (!combat.value) return;
  const combatant = combat.value.combatants.find(c => c.id === combatantId);
  if (!combatant) return;
  
  const newCurrent = Math.max(0, combatant.hitPoints.current + change);
  combatStore.updateCombatant(combat.value.id, combatantId, { 
    hitPoints: { 
      ...combatant.hitPoints, 
      current: newCurrent 
    } 
  });
};

// Quick actions functionality
const rollInitiative = () => {
  if (!combat.value) return;
  
  combat.value.combatants.forEach(combatant => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const modifier = Math.floor((combatant.initiative - 10) / 2);
    const total = roll + modifier;
    combatant.initiative = total;
    addLogEntry(`${combatant.name} rolled initiative: ${roll} + ${modifier} = ${total}`, 'action');
  });
  
  // Sort combatants by initiative (highest first)
  combat.value.combatants.sort((a, b) => b.initiative - a.initiative);
  
  // Update each combatant's initiative
  combat.value.combatants.forEach(combatant => {
    combatStore.updateCombatant(combat.value!.id, combatant.id, { initiative: combatant.initiative });
  });
  
  addLogEntry('Initiative order updated', 'info');
};

const healAll = () => {
  if (!combat.value) return;
  
  combat.value.combatants.forEach(combatant => {
    const healed = combatant.hitPoints.maximum - combatant.hitPoints.current;
    combatant.hitPoints.current = combatant.hitPoints.maximum;
    combatant.hitPoints.temporary = 0;
    if (healed > 0) {
      addLogEntry(`${combatant.name} healed for ${healed} HP`, 'heal');
    }
    combatStore.updateCombatant(combat.value!.id, combatant.id, { 
      hitPoints: combatant.hitPoints 
    });
  });
  
  addLogEntry('All combatants healed to full HP', 'heal');
};

const clearConditions = (combatantId: string) => {
  if (!combat.value) return;
  combatStore.updateCombatant(combat.value.id, combatantId, { conditions: [] });
};

const toggleAutoAdvance = () => {
  autoAdvance.value = !autoAdvance.value;
  addLogEntry(`Auto advance ${autoAdvance.value ? 'enabled' : 'disabled'}`, 'info');
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

const newCondition = ref('');

// Available conditions for the grid
const availableConditions = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened', 
  'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified', 
  'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

// Track selected conditions for the current combatant
const selectedConditions = ref<Record<string, boolean>>({});

const addCondition = (combatantId: string, condition: string) => {
  if (!combat.value) return;
  const combatant = combat.value.combatants.find(c => c.id === combatantId);
  if (!combatant) return;
  
    const updatedConditions = [...combatant.conditions, condition];
    combatStore.updateCombatant(combat.value.id, combatantId, { conditions: updatedConditions });
};

const removeCondition = (combatantId: string, condition: string) => {
  if (!combat.value) return;
  const combatant = combat.value.combatants.find(c => c.id === combatantId);
  if (!combatant) return;
  
    const updatedConditions = combatant.conditions.filter(c => c !== condition);
    combatStore.updateCombatant(combat.value.id, combatantId, { conditions: updatedConditions });
};

const handleConditionToggle = (combatantId: string, condition: string, isSelected: boolean) => {
  if (isSelected) {
    addCondition(combatantId, condition);
  } else {
    removeCondition(combatantId, condition);
  }
};

const updateSelectedConditions = (combatantId: string) => {
  if (!combat.value) return;
  
  const combatant = combat.value.combatants.find(c => c.id === combatantId);
  if (combatant) {
    selectedConditions.value = availableConditions.reduce((acc, condition) => {
      acc[condition] = combatant.conditions.includes(condition);
      return acc;
    }, {} as Record<string, boolean>);
  }
};

// Watch for combat state changes
watch(() => combat.value?.currentTurn, (newTurn, oldTurn) => {
  if (newTurn !== undefined && oldTurn !== undefined && combat.value) {
    const combatant = combat.value.combatants[newTurn];
    if (combatant) {
      addLogEntry(`${combatant.name}'s turn`, 'action');
      updateSelectedConditions(combatant.id);
    }
  }
});

watch(() => combat.value?.currentRound, (newRound, oldRound) => {
  if (newRound !== undefined && oldRound !== undefined && newRound !== oldRound) {
    addLogEntry(`Round ${newRound} begins!`, 'info');
  }
});

// Watch for current combatant changes to update selected conditions
watch(currentCombatant, (newCombatant) => {
  if (newCombatant) {
    updateSelectedConditions(newCombatant.id);
  }
});

onMounted(() => {
  if (combat.value) {
    addLogEntry(`Loaded combat for encounter: ${encounter.value?.name}`, 'info');
    if (currentCombatant.value) {
      updateSelectedConditions(currentCombatant.value.id);
    }
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
      <div class="controls">
        <Button size="small" variant="secondary" @click="previousTurn" title="Previous Turn">
          <i class="si si-arrow-left"></i>
        </Button>
        <Button size="small" variant="secondary" @click="nextTurn" title="Next Turn">
          <i class="si si-arrow-right"></i>
        </Button>
        <Button size="small" variant="danger" @click="endCombat" title="End Combat">
          <i class="si si-close"></i>
        </Button>
      </div>
    </div>

    <div class="current-turn" v-if="currentCombatant">
      <h3>Current Turn: {{ currentCombatant.name }}</h3>
      <div class="combatant-details">
        <p>Type: {{ currentCombatant.type }}</p>
        <p>HP: {{ currentCombatant.hitPoints.current }}/{{ currentCombatant.hitPoints.maximum }}</p>
        <p>AC: {{ currentCombatant.armorClass }}</p>

        <div class="hp-controls">
          <Button size="small" variant="danger" @click="updateHitPoints(currentCombatant.id, -1)">-1</Button>
          <Button size="small" variant="danger" @click="updateHitPoints(currentCombatant.id, -5)">-5</Button>
          <Button size="small" variant="success" @click="updateHitPoints(currentCombatant.id, 1)">+1</Button>
          <Button size="small" variant="success" @click="updateHitPoints(currentCombatant.id, 5)">+5</Button>
        </div>

        <div class="conditions">
          <h4>Conditions:</h4>
          <div class="conditions-grid">
            <div v-for="condition in availableConditions" :key="condition" class="condition-item">
              <ToggleSwitch
                :model-value="selectedConditions[condition] || false"
                @update:model-value="(value: boolean) => handleConditionToggle(currentCombatant!.id, condition, value)"
              />
              <span class="condition-label">{{ condition }}</span>
            </div>
          </div>
        </div>
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
        <span class="initiative">{{ combatant.initiative }}</span>
        <span class="hp">{{ combatant.hitPoints.current }}/{{ combatant.hitPoints.maximum }}</span>
        <span class="ac">AC: {{ combatant.armorClass }}</span>
        <span class="conditions">
          <span v-for="condition in combatant.conditions" :key="condition" class="condition-tag">
            {{ condition.substring(0, 3) }}
          </span>
        </span>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions" v-if="combat.status === 'active'">
      <h3>Quick Actions</h3>
      <div class="action-buttons">
        <Button variant="secondary" size="small" @click="rollInitiative" title="Roll Initiative">
          <i class="si si-dice"></i> <span>Roll Initiative</span>
        </Button>
        <Button variant="success" size="small" @click="healAll" title="Heal All">
          <i class="si si-heart"></i> <span>Heal All</span>
        </Button>
        <Button variant="secondary" size="small" @click="clearConditions(currentCombatant!.id)" title="Clear All Conditions">
          <i class="si si-erase"></i> <span>Clear Conditions</span>
        </Button>
        <Button :variant="autoAdvance ? 'primary' : 'secondary'" size="small" @click="toggleAutoAdvance" :title="autoAdvance ? 'Pause Auto-Advance' : 'Enable Auto-Advance'">
          <i :class="['si', autoAdvance ? 'si-player-pause' : 'si-player-play']"></i> <span>Auto Advance</span>
        </Button>
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
      <Button variant="secondary" size="small" @click="clearLog" title="Clear Log">
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
  border: 1px solid #ddd;
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
  background-color: #f0f7ff;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.hp-controls {
  margin: 0.5rem 0;
}

.condition-tag {
  display: inline-block;
  background: #e0e0e0;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 4px;
  font-size: 0.8em;
}

.add-condition {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.conditions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.condition-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem;
  border-radius: var(--border-radius);
  background: var(--color-background);
}

.condition-label {
  font-size: 0.9rem;
  color: var(--color-text);
  text-transform: capitalize;
}

.initiative-item {
  display: flex;
  padding: 8px;
  border-bottom: 1px solid #eee;
  align-items: center;
}

.initiative-item.current {
  background-color: #ffeb3b;
  font-weight: bold;
}

.player { background-color: #e8f5e9; }
.monster { background-color: #ffebee; }

.order { width: 30px; }
.name { flex: 2; }
.initiative, .hp, .ac { flex: 1; }
.conditions { flex: 2; }

.quick-actions {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.quick-actions h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.action-buttons .si {
  margin-right: 0.5em;
}

.controls .si {
  vertical-align: middle;
}

.combat-log {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.combat-log h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
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
  background: #e3f2fd;
  color: #1976d2;
}

.log-entry.action {
  background: #fff3e0;
  color: #f57c00;
}

.log-entry.damage {
  background: #ffebee;
  color: #d32f2f;
}

.log-entry.heal {
  background: #e8f5e9;
  color: #2e7d32;
}

.log-time {
  font-weight: 500;
  min-width: 80px;
}

.log-message {
  flex: 1;
}
</style>
