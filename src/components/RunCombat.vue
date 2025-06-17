<template>
  <div class="run-combat" v-if="encounter">
    <div class="combat-header">
      <div class="encounter-info">
        <h1>{{ encounter.name }}</h1>
        <div class="encounter-meta">
          <span class="difficulty">{{ encounter.difficulty }}</span>
          <span class="level">Level {{ encounter.level }}</span>
          <span class="xp">{{ encounter.xp }} XP</span>
        </div>
      </div>
      <div class="combat-controls">
        <button 
          v-if="encounter.status === 'preparing'" 
          @click="startCombat" 
          class="start-btn"
        >
          🚀 Start Combat
        </button>
        <button 
          v-if="encounter.status === 'active'" 
          @click="resetCombat" 
          class="reset-btn"
        >
          🔄 Reset Combat
        </button>
        <button 
          v-if="encounter.status === 'active'" 
          @click="endCombat" 
          class="end-btn"
        >
          🏁 End Combat
        </button>
      </div>
    </div>

    <div class="combat-status" v-if="encounter.status === 'active'">
      <div class="status-indicator active">
        <span class="status-icon">⚔️</span>
        <span class="status-text">Combat Active</span>
      </div>
    </div>

    <div class="combat-status" v-else-if="encounter.status === 'preparing'">
      <div class="status-indicator preparing">
        <span class="status-icon">📋</span>
        <span class="status-text">Preparing for Combat</span>
      </div>
    </div>

    <div class="combat-status" v-else-if="encounter.status === 'completed'">
      <div class="status-indicator completed">
        <span class="status-icon">🏆</span>
        <span class="status-text">Combat Completed</span>
      </div>
    </div>

    <!-- Combat Tracker -->
    <CombatTracker :encounterId="encounter.id" />

    <!-- Combat Summary -->
    <div class="combat-summary" v-if="encounter.status === 'active'">
      <h3>Combat Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <label>Round:</label>
          <span class="summary-value">{{ encounter.currentRound }}</span>
        </div>
        <div class="summary-item">
          <label>Turn:</label>
          <span class="summary-value">{{ encounter.currentTurn + 1 }} of {{ encounter.combatants.length }}</span>
        </div>
        <div class="summary-item">
          <label>Active Combatants:</label>
          <span class="summary-value">{{ activeCombatants }}</span>
        </div>
        <div class="summary-item">
          <label>Downed Combatants:</label>
          <span class="summary-value">{{ downedCombatants }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions" v-if="encounter.status === 'active'">
      <h3>Quick Actions</h3>
      <div class="action-buttons">
        <button @click="rollInitiative" class="action-btn">
          🎲 Roll Initiative
        </button>
        <button @click="healAll" class="action-btn">
          💚 Heal All
        </button>
        <button @click="clearConditions" class="action-btn">
          🧹 Clear All Conditions
        </button>
        <button @click="toggleAutoAdvance" class="action-btn" :class="{ active: autoAdvance }">
          {{ autoAdvance ? '⏸️' : '▶️' }} Auto Advance
        </button>
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
      <button @click="clearLog" class="clear-log-btn">Clear Log</button>
    </div>
  </div>
  <div v-else class="no-encounter">
    <p>No encounter found.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEncounterStore } from '@/stores/encounters';
import CombatTracker from '@/components/CombatTracker.vue';
import type { Encounter } from '@/types';

const route = useRoute();
const encounterStore = useEncounterStore();
const autoAdvance = ref(false);
const combatLog = ref<Array<{ id: string; timestamp: number; message: string; type: 'info' | 'action' | 'damage' | 'heal' }>>([]);

const encounter = computed(() => {
  const id = route.params.id as string;
  return encounterStore.getEncounter(id);
});

const activeCombatants = computed(() => {
  if (!encounter.value) return 0;
  return encounter.value.combatants.filter(c => c.hitPoints.current > 0).length;
});

const downedCombatants = computed(() => {
  if (!encounter.value) return 0;
  return encounter.value.combatants.filter(c => c.hitPoints.current <= 0).length;
});

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

const startCombat = () => {
  if (!encounter.value) return;
  encounterStore.startCombat(encounter.value.id);
  addLogEntry('Combat started!', 'info');
};

const resetCombat = () => {
  if (!encounter.value) return;
  encounterStore.resetCombat(encounter.value.id);
  addLogEntry('Combat reset to preparation phase', 'info');
};

const endCombat = () => {
  if (!encounter.value) return;
  encounterStore.endEncounter(encounter.value.id);
  addLogEntry('Combat ended', 'info');
};

const rollInitiative = () => {
  if (!encounter.value) return;
  
  encounter.value.combatants.forEach(combatant => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const modifier = Math.floor((combatant.initiative - 10) / 2);
    const total = roll + modifier;
    combatant.initiative = total;
    addLogEntry(`${combatant.name} rolled initiative: ${roll} + ${modifier} = ${total}`, 'action');
  });
  
  // Sort combatants by initiative (highest first)
  encounter.value.combatants.sort((a, b) => b.initiative - a.initiative);
  encounterStore.saveEncounters();
  addLogEntry('Initiative order updated', 'info');
};

const healAll = () => {
  if (!encounter.value) return;
  
  encounter.value.combatants.forEach(combatant => {
    const healed = combatant.hitPoints.maximum - combatant.hitPoints.current;
    combatant.hitPoints.current = combatant.hitPoints.maximum;
    combatant.hitPoints.temporary = 0;
    if (healed > 0) {
      addLogEntry(`${combatant.name} healed for ${healed} HP`, 'heal');
    }
  });
  
  encounterStore.saveEncounters();
  addLogEntry('All combatants healed to full HP', 'heal');
};

const clearConditions = () => {
  if (!encounter.value) return;
  
  encounter.value.combatants.forEach(combatant => {
    if (combatant.conditions.length > 0) {
      addLogEntry(`Cleared conditions from ${combatant.name}: ${combatant.conditions.join(', ')}`, 'action');
      combatant.conditions = [];
    }
  });
  
  encounterStore.saveEncounters();
  addLogEntry('All conditions cleared', 'action');
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

// Watch for combat state changes
watch(() => encounter.value?.currentTurn, (newTurn, oldTurn) => {
  if (newTurn !== undefined && oldTurn !== undefined && encounter.value) {
    const combatant = encounter.value.combatants[newTurn];
    if (combatant) {
      addLogEntry(`${combatant.name}'s turn`, 'action');
    }
  }
});

watch(() => encounter.value?.currentRound, (newRound, oldRound) => {
  if (newRound !== undefined && oldRound !== undefined && newRound !== oldRound) {
    addLogEntry(`Round ${newRound} begins!`, 'info');
  }
});

onMounted(() => {
  if (encounter.value) {
    addLogEntry(`Loaded encounter: ${encounter.value.name}`, 'info');
  }
});
</script>

<style scoped>
.run-combat {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.combat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-border);
}

.encounter-info h1 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 2rem;
}

.encounter-meta {
  display: flex;
  gap: 1rem;
  color: var(--color-text-light);
}

.difficulty, .level, .xp {
  padding: 0.25rem 0.5rem;
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  font-size: 0.9rem;
}

.combat-controls {
  display: flex;
  gap: 1rem;
}

.start-btn, .reset-btn, .end-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;
}

.start-btn {
  background: var(--color-primary);
  color: white;
}

.reset-btn {
  background: var(--color-warning);
  color: white;
}

.end-btn {
  background: var(--color-danger);
  color: white;
}

.start-btn:hover, .reset-btn:hover, .end-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.combat-status {
  margin-bottom: 2rem;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius);
  font-weight: 500;
}

.status-indicator.active {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #4caf50;
}

.status-indicator.preparing {
  background: #fff3e0;
  color: #f57c00;
  border: 1px solid #ff9800;
}

.status-indicator.completed {
  background: #e3f2fd;
  color: #1976d2;
  border: 1px solid #2196f3;
}

.status-icon {
  font-size: 1.2rem;
}

.combat-summary {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.combat-summary h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
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
}

.summary-item label {
  font-weight: 500;
  color: var(--color-text);
}

.summary-value {
  font-weight: bold;
  color: var(--color-primary);
}

.quick-actions {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.quick-actions h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.action-btn {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--color-background-soft);
  transform: translateY(-1px);
}

.action-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.combat-log {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
}

.combat-log h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.log-entries {
  max-height: 300px;
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

.clear-log-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
}

.clear-log-btn:hover {
  background: var(--color-background-soft);
}

.no-encounter {
  text-align: center;
  color: var(--color-text-light);
  margin: 2rem 0;
}
</style> 