<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePartyStore } from '@/stores/parties';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { useMonsterStore } from '@/stores/monsters';
import { useCharacterStore } from '@/stores/characters';
import { Combat, Combatant, Encounter, Monster, PlayerCharacter } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';

const props = defineProps<{
  isOpen: boolean;
  encounter: Encounter | null;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'combat-created', combat: Combat): void;
}>();

const partyStore = usePartyStore();
const combatStore = useCombatStore();
const encounterStore = useEncounterStore();
const monsterStore = useMonsterStore();
const characterStore = useCharacterStore();

const selectedPartyId = ref<string>('');

onMounted(async () => {
  await Promise.all([
    partyStore.loadParties(),
    monsterStore.loadMonsters()
  ]);
});

const handleCreateCombat = () => {
  if (!props.encounter || !selectedPartyId.value) {
    alert('Please select a party');
    return;
  }

  const selectedParty = partyStore.getPartyById(selectedPartyId.value);
  if (!selectedParty) {
    alert('Selected party not found');
    return;
  }

  // Get party characters
  const partyCharacters = characterStore.all.filter(c => c.partyId === selectedPartyId.value);
  
  // Get encounter monsters
  const encounterMonsterIds = Object.keys(props.encounter!.monsters || {});
  const encounterMonsters = monsterStore.monsters.filter(m => 
    encounterMonsterIds.includes(m.id)
  );

  // Create combatants from characters
  const characterCombatants: Combatant[] = partyCharacters.map(char => ({
    id: generateId(),
    name: char.name,
    type: 'player',
    initiative: char.initiative,
    armorClass: char.armorClass,
    hitPoints: {
      maximum: char.hitPoints.maximum,
      current: char.hitPoints.current,
      temporary: char.hitPoints.temporary || 0
    },
    conditions: [],
    referenceId: char.id,
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }));

  // Create combatants from monsters with counts
  const monsterCombatants: Combatant[] = [];
  encounterMonsters.forEach(monster => {
    const count = props.encounter!.monsters[monster.id] || 1;
    for (let i = 0; i < count; i++) {
      monsterCombatants.push({
        id: generateId(),
        name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
        type: 'monster',
        initiative: 0, // Will be rolled
        armorClass: monster.armorClass,
        hitPoints: {
          maximum: monster.hitPoints,
          current: monster.hitPoints,
          temporary: 0
        },
        conditions: [],
        referenceId: monster.id,
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  });

  // Combine all combatants
  const allCombatants = [...characterCombatants, ...monsterCombatants];

  // Create the combat
  const newCombat: Omit<Combat, 'id'> = {
    encounterId: props.encounter.id,
    partyId: selectedPartyId.value,
    status: 'preparing',
    currentRound: 0,
    currentTurn: 0,
    combatants: allCombatants,
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const createdCombat = combatStore.createCombat(newCombat);
  emit('combat-created', createdCombat);
};

const handleCancel = () => {
  selectedPartyId.value = '';
  emit('cancel');
};

const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    title="Start Combat"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Start Combat"
    cancelLabel="Cancel"
    modalId="party-selector-modal"
    @submit="handleCreateCombat"
    @cancel="handleCancel"
  >
    <div class="party-selector">
      <div class="form-section">
        <label>Select Party</label>
        <select v-model="selectedPartyId" required>
          <option value="">Choose a party...</option>
          <option v-for="party in partyStore.filteredParties" :key="party.id" :value="party.id">
            {{ party.name }} ({{ party.characters.length }} characters)
          </option>
        </select>
      </div>

      <div v-if="selectedPartyId" class="party-info">
        <h4>Party Information</h4>
        <div class="party-details">
          <p><strong>Party:</strong> {{ partyStore.getPartyById(selectedPartyId)?.name }}</p>
          <p><strong>Characters:</strong> {{ characterStore.all.filter(c => c.partyId === selectedPartyId).length }}</p>
          <p><strong>Monsters:</strong> {{ Object.values(encounter?.monsters || {}).reduce((sum, count) => sum + count, 0) }}</p>
        </div>
      </div>

      <div class="encounter-info">
        <h4>Encounter Information</h4>
        <div class="encounter-details">
          <p><strong>Encounter:</strong> {{ encounter?.name }}</p>
          <p><strong>Difficulty:</strong> {{ encounter?.difficulty }}</p>
          <p><strong>Level:</strong> {{ encounter?.level }}</p>
          <p><strong>XP:</strong> {{ encounter?.xp }}</p>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.party-selector {
  padding: 1rem 0;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-section label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-weight: var(--font-medium);
}

.form-section select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.party-info,
.encounter-info {
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-bottom: 1rem;
}

.party-info h4,
.encounter-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-size: 1rem;
}

.party-details,
.encounter-details {
  margin: 0;
}

.party-details p,
.encounter-details p {
  margin: 0.25rem 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.party-details strong,
.encounter-details strong {
  color: var(--color-text);
}
</style> 
