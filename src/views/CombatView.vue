<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { usePartyStore } from '@/stores/parties';
import { useModuleStore } from '@/stores/modules';
import type { Combat } from '@/types';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Button from '@/components/form/Button.vue';
import { useI18n } from 'vue-i18n';
import {useCharacterStore} from "@/stores/characters";
import {useMonsterStore} from "@/stores/monsters";
import BaseModal from "@/components/common/BaseModal.vue";
import ToggleSwitch from "@/components/common/ToggleSwitch.vue";
import { IconFlag, IconGhost3, IconListNumbers, IconUserPlus, IconUser, IconCheck, IconBolt, IconPlayerPause, IconSwords, IconTrophy } from '@tabler/icons-vue';

const route = useRoute();
const router = useRouter();
const combatStore = useCombatStore();
const characterStore = useCharacterStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();
const partyStore = usePartyStore();
const moduleStore = useModuleStore();
const { t } = useI18n();

onMounted(async () => {
  await characterStore.load();
  await monsterStore.load();
  await combatStore.load();
  await encounterStore.load();
  await partyStore.load();
  await moduleStore.load();
});

const combat = ref<Combat | null>(null);
const loading = computed(() => !combatStore.isLoaded);
const notFound = computed(() => combatStore.isLoaded && !combat.value);

// Add local state for new participant
const activeParticipantIndex = ref(0);

// Modal state
const isInitiativeModalOpen = ref(false);
const editingParticipant = ref<any>(null);
const newInitiative = ref(0);
const isAddParticipantModalOpen = ref(false);
const localParticipants = ref<Record<string, { selected: boolean; initiative: number }>>({});

// Computed: current participant
const currentParticipant = computed(() => {
  if (!combat.value || combat.value.status !== 'active' || !combat.value.combatants.length) return null;
  return combat.value.combatants[activeParticipantIndex.value];
});

const encounter = computed(() => combat.value ? encounterStore.getById(combat.value.encounterId) : null);
const party = computed(() => combat.value ? partyStore.getById(combat.value.partyId) : null);

const partyCharacters = computed(() => {
  if (!party.value) return [];
  return party.value.characters
    .map(id => characterStore.getById(id))
    .filter((c): c is NonNullable<typeof c> => !!c);
});

const encounterMonsters = computed(() => {
  if (!encounter.value) return [];
  // encounter.value.monsters is Record<UUID, number>
  const monsters: any[] = [];
  Object.entries(encounter.value.monsters).forEach(([monsterId, count]) => {
    const monster = monsterStore.getById(monsterId);
    if (monster) {
      for (let i = 0; i < count; i++) {
        monsters.push({ ...monster, instance: i + 1 });
      }
    }
  });
  return monsters;
});

const allParticipants = computed(() => {
  const players = partyCharacters.value.map(c => ({
    id: c.id,
    type: 'player',
    referenceId: c.id
  }));
  const monsters = encounterMonsters.value.map(m => ({
    id: m.id + (m.instance ? `-${m.instance}` : ''),
    type: 'monster',
    referenceId: m.id
  }));
  return [...players, ...monsters];
});

const availableCharactersToAdd = computed(() => {
  if (!combat.value) return [];
  const combatantCharacterIds = new Set(
    combat.value.combatants.filter(c => c.type === 'player').map(c => c.referenceId)
  );
  return partyCharacters.value.filter(c => !combatantCharacterIds.has(c.id));
});

// Helper to get display name for a combatant
function getCombatantDisplayName(combatant: { type: string; referenceId?: string; id: string }) {
  if (combatant.type === 'player' && combatant.referenceId) {
    const char = characterStore.getById(combatant.referenceId);
    return char ? char.name : 'Unknown Player';
  } else if (combatant.type === 'monster' && combatant.referenceId) {
    const monster = monsterStore.getById(combatant.referenceId);
    if (monster) {
      // If there are multiple monsters of the same type, add a number
      const all = combat.value?.combatants.filter(c => c.referenceId === combatant.referenceId && c.type === 'monster') || [];
      if (all.length > 1) {
        const idx = all.findIndex(c => c.id === combatant.id);
        return `${monster.name} #${idx + 1}`;
      }
      return monster.name;
    }
    return 'Unknown Monster';
  }
  return 'Unknown';
}

function updateCombatFromStore() {
  if (!combatStore.isLoaded) return;
  const combatId = route.params.id as string;
  const found = combatStore.getById(combatId);
  if (found) {
    combat.value = found;
  } else {
    router.push('/combats');
  }
}

watch(combat, (newCombat) => {
  if (newCombat && newCombat.status === 'preparing' && newCombat.combatants.length === 0 && allParticipants.value.length > 0) {
    const now = Date.now();
    newCombat.combatants = allParticipants.value.map(p => ({
      id: p.id,
      type: p.type as 'player' | 'monster',
      referenceId: p.referenceId,
      initiative: 0,
      hasActed: false,
      isPostponed: false,
      createdAt: now,
      updatedAt: now
    }));
  }
}, { immediate: true });

watch(
  () => combatStore.items, 
  updateCombatFromStore, 
  { deep: true, immediate: true }
);

watch(isAddParticipantModalOpen, (isOpen) => {
  if (isOpen) {
    localParticipants.value = availableCharactersToAdd.value.reduce((acc, p) => {
      acc[p.id] = { selected: false, initiative: 0 };
      return acc;
    }, {} as Record<string, { selected: boolean, initiative: number }>);
  }
});

const getEncounterName = (encounterId: string) => {
  const encounter = encounterStore.getById(encounterId);
  return encounter ? encounter.name : 'Unknown Encounter';
};

const getPartyName = (partyId: string) => {
  const party = partyStore.getById(partyId);
  return party ? party.name : 'Unknown Party';
};

// Computed properties for BaseEntityView
const combatTitle = computed(() => {
  if (!combat.value) return '';
  return `${getEncounterName(combat.value.encounterId)} vs ${getPartyName(combat.value.partyId)}`;
});

// Start
function startCombat() {
  if (!combat.value || combat.value.combatants.length < 1) return;

  const updatedCombatants = combat.value.combatants.map(c => ({
    ...c,
    hasActed: false,
    isPostponed: false
  })).sort((a, b) => b.initiative - a.initiative);

  combatStore.update(combat.value.id, {
    status: 'active',
    currentRound: 1,
    currentTurn: 0,
    combatants: updatedCombatants,
  });

  activeParticipantIndex.value = 0;
}

// Next turn
function nextTurn() {
  if (!combat.value || combat.value.status !== 'active') return;
  if (currentParticipant.value) {
    currentParticipant.value.hasActed = true;
  }
  let nextIndex = -1;
  for (let i = activeParticipantIndex.value + 1; i < combat.value.combatants.length; i++) {
    if (!combat.value.combatants[i].hasActed && !combat.value.combatants[i].isPostponed) {
      nextIndex = i;
      break;
    }
  }
  if (nextIndex !== -1) {
    activeParticipantIndex.value = nextIndex;
  } else {
    startNewRound();
  }
}

// Start new round
function startNewRound() {
  if (!combat.value) return;
  combat.value.combatants.sort((a, b) => b.initiative - a.initiative);
  combat.value.currentRound++;
  combat.value.combatants.forEach(p => {
    p.hasActed = false;
    p.isPostponed = false;
  });
  activeParticipantIndex.value = 0;
}

// Postpone current
function postponeCurrent() {
  if (!combat.value || combat.value.status !== 'active' || !currentParticipant.value) return;
  currentParticipant.value.isPostponed = true;
  nextTurn();
}

// Activate postponed
function activatePostponed(id: string) {
  if (!combat.value) return;
  const participant = combat.value.combatants.find(p => p.id === id);
  if (!participant) return;
  participant.isPostponed = false;
  participant.hasActed = false;
  if (combat.value.status === 'active') {
    const index = combat.value.combatants.findIndex(p => p.id === id);
    if (index !== -1) {
      activeParticipantIndex.value = index;
    }
  }
}

// End battle
function endCombat() {
  if (!combat.value) return;
  combatStore.endCombat(combat.value.id);
}

function openInitiativeModal(participant: any) {
  if (combat.value && combat.value.status === 'preparing') {
    editingParticipant.value = participant;
    newInitiative.value = participant.initiative;
    isInitiativeModalOpen.value = true;
  }
}

function saveInitiative() {
  if (!combat.value || !editingParticipant.value || combat.value.status !== 'preparing') return;
  const combatants = [...combat.value.combatants];
  const pIndex = combatants.findIndex(p => p.id === editingParticipant.value.id);

  if (pIndex > -1) {
    combatants[pIndex] = {
      ...combatants[pIndex],
      initiative: newInitiative.value,
      updatedAt: Date.now()
    };
    combatStore.update(combat.value.id, { combatants });
  }

  isInitiativeModalOpen.value = false;
  editingParticipant.value = null;
}

function handleParticipantToggle(participantId: string, isSelected: boolean) {
  if (localParticipants.value[participantId]) {
    localParticipants.value[participantId].selected = isSelected;
  }
}

function handleInitiativeChange(participantId: string, initiative: number) {
  if (localParticipants.value[participantId]) {
    localParticipants.value[participantId].initiative = initiative;
  }
}

function handleAddParticipants() {
  if (!combat.value) return;

  const now = Date.now();
  const newCombatants = Object.entries(localParticipants.value)
    .filter(([, data]) => data.selected)
    .map(([characterId, data]) => {
      return {
        id: characterId,
        type: 'player' as const,
        referenceId: characterId,
        initiative: data.initiative,
        hasActed: false,
        isPostponed: false,
        createdAt: now,
        updatedAt: now
      };
    });

  if (newCombatants.length > 0) {
    const updatedCombatants = [...combat.value.combatants, ...newCombatants];
    combatStore.update(combat.value.id, { combatants: updatedCombatants });
  }

  isAddParticipantModalOpen.value = false;
}
</script>

<template>
  <BaseEntityView
    :entity="combat"
    entity-name="Combat"
    list-route="/combats"
    :title="combatTitle"
    :not-found="notFound"
    :loading="loading"
  >
    <template #actions>
      <Button
        v-if="combat && combat.status === 'preparing'"
        variant="primary"
        @click="startCombat"
        class="start-btn"
        :disabled="combat.combatants.length < 1"
      >
        <IconSwords /> Start
      </Button>
      <Button
        v-if="combat && combat.status === 'active'"
        variant="danger"
        @click="endCombat"
        class="end-btn"
      >
        <IconFlag /> End
      </Button>
    </template>
    <!-- Combat Content -->
    <div v-if="combat" class="combat-content">
      <!-- Phase Tabs and Round/Turn Display -->
      <div class="phase-indicator">
        <div 
          class="phase-tab" 
          :class="{active: combat && combat.status === 'preparing'}"
        >
          <IconListNumbers /> Preparation
        </div>
        <div 
          class="phase-tab" 
          :class="{active: combat && combat.status === 'active'}"
        >
          <IconSwords /> Active
        </div>
        <div 
          class="phase-tab" 
          :class="{active: combat && combat.status === 'completed'}"
        >
          <IconTrophy /> Ended
        </div>
      </div>


              <!-- Combat Summary -->
      <div class="combat-summary" v-if="combat?.status === 'active'">
        <h3>{{ t('combat.summary') }}</h3>
        
          <div class="current-turn" v-if="combat && combat.status === 'active' && combat.combatants.length">
            Current Turn: {{ currentParticipant ? getCombatantDisplayName(currentParticipant) : '' }}
            <span v-if="currentParticipant?.isPostponed">(Postponed)</span>
          </div>
          <div class="summary-grid">
            <div class="summary-item">
              <label>{{ t('combat.round') }}</label>
              <span class="summary-value">{{ combat?.currentRound }}</span>
            </div>
            <div class="summary-item">
              <label>{{ t('combat.turn') }}</label>
              <span class="summary-value">{{ (combat?.currentTurn ?? 0) + 1 }} of {{ combat?.combatants?.length ?? 0 }}</span>
            </div>
          </div>
      </div>

      <!-- Ended State -->
      <div v-if="combat && combat.status === 'completed'" class="combat-summary empty-state">
        <IconFlag /> The encounter has concluded after {{ combat.currentRound }} rounds.
      </div>

      <!-- Participants Section -->
      <div class="participants-section">
        <div class="combat-title">
          <h2>Participants: {{ combat.combatants.length }}</h2>
          <Button
            v-if="combat && (combat.status === 'preparing' || combat.status === 'active')"
            @click="isAddParticipantModalOpen = true"
            :disabled="availableCharactersToAdd.length === 0"
            size="large"
            :title="t('combat.addParticipant')"
          >
            <IconUserPlus />
          </Button>
        </div>

        <!-- Participant List -->
        <div v-if="combat.combatants.length" class="participant-list">
          <div
            v-for="(participant, index) in combat.combatants"
            :key="participant.id"
            @click="openInitiativeModal(participant)"
            :class="{
              'participant-row': true,
              preparing: combat && combat.status === 'preparing',
              active: combat && combat.status === 'active' && activeParticipantIndex === index,
              postponed: participant.isPostponed,
              acted: combat && combat.status === 'active' && participant.hasActed && !participant.isPostponed
            }"
          >
            <div class="participant-artwork">
              <template v-if="participant.type === 'player'">
                <IconUser />
              </template>
              <IconGhost3 v-else />
            </div>

            <div class="participant-info">
              <div class="participant-name">
                {{ getCombatantDisplayName(participant) }}
              </div>
              <div class="participant-initiative">
                {{ participant.initiative }}
              </div>
            </div>

            <div class="participant-status">
              <span v-if="combat && combat.status === 'active'">
                <span v-if="participant.isPostponed" class="participant-badge badge-postponed">
                  <i class="fas fa-clock"></i> Postponed
                </span>
                <span v-else-if="participant.hasActed" class="participant-badge badge-acted">
                  <IconCheckCircle /> Acted this round
                </span>
              </span>
            </div>

            <div class="participant-actions">
              <Button
                v-if="combat && combat.status === 'active' && participant.isPostponed"
                variant="success"
                size="large"
                @click="activatePostponed(participant.id)"
              >
                <IconBolt />
              </Button>
              <div class="controls" v-if="combat && combat.status === 'active' && activeParticipantIndex === index">
                <Button size="large" variant="warning" @click="postponeCurrent" :disabled="!currentParticipant">
                  <IconPlayerPause />
                </Button>
                <Button size="large" variant="success" @click="nextTurn" :disabled="!currentParticipant">
                  <IconCheck />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="combat?.notes" class="content-section">
        <h3>{{ t('combat.notes') }}</h3>
        <p class="notes">{{ combat?.notes }}</p>
      </div>
    </div>
    <div v-else>
      <p>{{ t('combat.noActive') }}</p>
    </div>
    <BaseModal
      :is-open="isInitiativeModalOpen"
      @cancel="isInitiativeModalOpen = false"
      @submit="saveInitiative"
      modal-id="initiative-modal"
      :title="t('combat.setInitiative')"
      :showSubmit="true"
      :showCancel="true"
      submitLabel="t('common.save')"
      cancelLabel="t('common.cancel')"
    >
      <div class="initiative-modal-content">
        <p v-if="editingParticipant">
          {{ t('combat.setInitiativeFor', { name: getCombatantDisplayName(editingParticipant) }) }}
        </p>
        <input type="number" v-model.number="newInitiative" class="initiative-input" :placeholder="t('combat.initiativePlaceholder')" />
      </div>
    </BaseModal>

    <BaseModal
      :is-open="isAddParticipantModalOpen"
      @cancel="isAddParticipantModalOpen = false"
      @submit="handleAddParticipants"
      :title="t('combat.addParticipantTitle')"
      modal-id="add-participant-modal"
      :show-submit="true"
      :show-cancel="true"
      submit-label="t('common.add')"
      cancel-label="t('common.cancel')"
    >
      <div v-if="availableCharactersToAdd.length === 0" class="empty-state">
        <p>{{ t('combat.allPartyCharactersAdded') }}</p>
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('common.name') }}</th>
            <th>{{ t('common.add') }}</th>
            <th>{{ t('common.initiative') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in availableCharactersToAdd" :key="p.id">
            <td>{{ p.name }}</td>
            <td>
              <ToggleSwitch
                :model-value="localParticipants[p.id]?.selected"
                @update:model-value="val => handleParticipantToggle(p.id, val)"
              />
            </td>
            <td>
              <input
                v-if="localParticipants[p.id]?.selected"
                type="number"
                class="initiative-input"
                :value="localParticipants[p.id]?.initiative"
                @change="handleInitiativeChange(p.id, parseInt(($event.target as HTMLInputElement).value))"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </BaseModal>
  </BaseEntityView>
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
  color: var(--color-text-inverse);
}

.status-badge.active {
  background: var(--color-success);
  color: var(--color-text-inverse);
}

.status-badge.completed {
  background: var(--color-primary);
  color: var(--color-text-inverse);
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
  color: var(--color-text-inverse);
}

.start-btn:hover {
  background: var(--color-success-dark);
}

.reset-btn {
  background: var(--color-warning);
  color: var(--color-text-inverse);
}

.reset-btn:hover {
  background: var(--color-warning-dark);
}

.end-btn {
  background: var(--color-danger);
  color: var(--color-text-inverse);
}

.end-btn:hover {
  background: var(--color-danger-dark);
}

.combat-controls .si {
  margin-right: 0.5em;
  vertical-align: middle;
}

.phase-indicator {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.phase-tab {
  padding: 0.5rem 1.5rem 0.25rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--color-text-light);
  font-weight: 500;
  font-size: 1.1rem;
  box-shadow: none;
  border-radius: 0;
  cursor: default;
  transition: color 0.2s, border-bottom 0.2s;
}

.phase-tab.active {
  color: var(--color-primary);
  border-bottom: 3px solid var(--color-primary);
}

.participant-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.participant-row {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  position: relative;
  overflow: hidden;
}

.participant-row.preparing {
  cursor: pointer;
}

.participant-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--track-item-color, transparent);
  transition: width 0.2s;
}

.participant-row:hover::before,
.participant-row.active::before {
  width: 8px;
}

.participant-row:hover {
  box-shadow: var(--shadow-sm);
}

.participant-row.active {
  background-color: var(--color-info-light);
  --track-item-color: var(--color-info);
}

.participant-row.postponed {
  --track-item-color: var(--color-warning);
}

.participant-row.acted {
  opacity: 0.6;
}

.participant-artwork {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background-size: cover;
  background-position: center;
  margin-right: 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-lighter);
  font-size: 24px;
  background-color: var(--color-background-mute);
}

.participant-info {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.participant-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-initiative {
  font-size: 0.9em;
  color: var(--color-text-light);
}

.participant-status {
  margin-left: 1rem;
  flex-basis: auto;
  min-width: 120px;
  text-align: center;
}

.participant-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
}

.participant-list tr.active {
  background-color: var(--color-info-light);
}

.initiative-modal-content {
  padding: 1rem;
}
.initiative-input {
  width: 5em;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background-color: var(--color-background-input);
  color: var(--color-text);
  font-size: 1rem;
}

.participant-badge.badge-acted {
   background: var(--color-success-light);
  color: var(--color-success-dark);
  padding: 0.1em 0.3em;
  border-radius: 4px;
}
.participant-badge.badge-postponed {
    background: var(--color-warning-light);
  color: var(--color-warning-dark);
  padding: 0.1em 0.3em;
  border-radius: 4px;
}

.info-message {
  padding: 1rem;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  text-align: center;
  color: var(--color-text-light);
}

.combat-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.phase-tab .tabler-icon {
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style> 

