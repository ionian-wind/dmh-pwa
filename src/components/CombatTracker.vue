<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useEncounterStore } from '@/stores/encounters';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import type { Combatant } from '@/types';
import Button from './Button.vue';

const props = defineProps<{
  encounterId: string;
}>();

const encounterStore = useEncounterStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();

const encounter = computed(() => {
  return encounterStore.encounters.find(e => e.id === props.encounterId);
});

const currentCombatant = computed(() => {
  if (encounter.value && encounter.value.combatants?.length > 0) {
    return encounter.value.combatants[encounter.value.currentTurn];
  }
  return null;
});

const nextTurn = () => {
  encounterStore.nextTurn(props.encounterId);
};

const previousTurn = () => {
  encounterStore.previousTurn(props.encounterId);
};

const endEncounter = () => {
  if (encounter.value) {
    encounterStore.endEncounter(encounter.value.id);
  }
};

const updateHitPoints = (combatantId: string, value: number) => {
  const combatant = encounter.value?.combatants.find(c => c.id === combatantId);
  if (combatant) {
    const newHP = combatant.hitPoints.current + value;
    combatant.hitPoints.current = Math.max(0, Math.min(newHP, combatant.hitPoints.maximum));
    encounterStore.saveEncounters();
  }
};

// Функция для получения деталей комбатанта
const combatantDetails = (combatant: Combatant) => {
  if (combatant.type === 'monster' && combatant.referenceId) {
    return monsterStore.monsters.find(m => m.id === combatant.referenceId);
  } else if (combatant.type === 'player' && combatant.referenceId && encounter.value) {
    const party = partyStore.parties.find(p => p.id === encounter.value.partyId);
    if (party && Array.isArray(party.characters)) {
      return party.characters.find(c => c === combatant.referenceId);
    }
  }
  return null;
};

const newCondition = ref('');

const addCondition = (combatantId: string, condition: string) => {
  const combatant = encounter.value?.combatants.find(c => c.id === combatantId);
  if (combatant && !combatant.conditions.includes(condition)) {
    combatant.conditions.push(condition);
    encounterStore.saveEncounters();
  }
};

const removeCondition = (combatantId: string, condition: string) => {
  const combatant = encounter.value?.combatants.find(c => c.id === combatantId);
  if (combatant) {
    combatant.conditions = combatant.conditions.filter(c => c !== condition);
    encounterStore.saveEncounters();
  }
};
</script>

<template>
  <div v-if="encounter" class="combat-tracker">
    <div class="header">
      <h2>{{ encounter.name }} - Round {{ encounter.currentRound }}</h2>
      <div class="controls">
        <Button size="small" variant="secondary" @click="previousTurn">Previous</Button>
        <Button size="small" variant="secondary" @click="nextTurn">Next</Button>
        <Button size="small" variant="danger" @click="endEncounter">End Encounter</Button>
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
          <div v-if="currentCombatant.conditions.length">
            <span v-for="condition in currentCombatant.conditions" :key="condition" class="condition-tag">
              {{ condition }}
              <Button size="small" variant="danger" @click="removeCondition(currentCombatant.id, condition)">×</Button>
            </span>
          </div>
          <p v-else>No conditions</p>
          <div class="add-condition">
            <select v-model="newCondition">
              <option value="blinded">Blinded</option>
              <option value="charmed">Charmed</option>
              <option value="frightened">Frightened</option>
              <option value="grappled">Grappled</option>
              <option value="paralyzed">Paralyzed</option>
              <option value="poisoned">Poisoned</option>
              <option value="prone">Prone</option>
              <option value="restrained">Restrained</option>
              <option value="stunned">Stunned</option>
              <option value="unconscious">Unconscious</option>
            </select>
            <Button size="small" @click="addCondition(currentCombatant.id, newCondition)">Add</Button>
          </div>
        </div>
      </div>
    </div>

    <div class="initiative-list">
      <div v-for="(combatant, index) in encounter.combatants"
           :key="combatant.id"
           class="initiative-item"
           :class="{ 
             'current': index === encounter.currentTurn,
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
</style>
