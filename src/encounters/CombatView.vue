<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { usePartyStore } from '@/stores/parties';
import type { Combat, Combatant } from '@/types';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import Button from '@/components/form/Button.vue';
import { useI18n } from 'vue-i18n';
import { useCharacterStore } from '@/stores/characters';
import { usePawnStore } from '@/stores/pawns';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import {
  IconFlag,
  IconGhost3,
  IconUser,
  IconUserPlus,
  IconCheck,
  IconBolt,
  IconPlayerPause,
  IconSwords,
  IconCircleCheck,
  IconX,
} from '@tabler/icons-vue';
import CombatWaitIcon from '@/encounters/CombatWaitIcon.vue';
import { S } from '@/utils/dice-roller/plugins/dice/tokens';
import { advanceTurn, rewindTurn, type TurnResult } from '@/utils/combatTurn';

const route = useRoute();
const router = useRouter();
const combatStore = useCombatStore();
const characterStore = useCharacterStore();
const pawnStore = usePawnStore();
const encounterStore = useEncounterStore();
const partyStore = usePartyStore();
const { t } = useI18n();

onMounted(async () => {
  await characterStore.load();
  await pawnStore.load();
  await combatStore.load();
  await encounterStore.load();
  await partyStore.load();
});

const combat = ref<Combat | null>(null);
const loading = computed(() => !combatStore.isLoaded);
const notFound = computed(() => combatStore.isLoaded && !combat.value);
const activeTab = computed(() => combat.value?.status ?? null);
const TABLER_STROKE =
  'fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round';
const tablerIcon = (paths: string[]) =>
  `${paths.map((path) => `${path}@@${TABLER_STROKE}`).join('&&')}|0 0 24 24`;
const phaseIcons = {
  preparing: tablerIcon([
    'M11 6h9',
    'M11 12h9',
    'M12 18h8',
    'M4 16a2 2 0 1 1 4 0c0 .591 -.5 1 -1 1.5l-3 2.5h4',
    'M6 10v-6l-2 2',
  ]),
  active: tablerIcon([
    'M21 3v5l-11 9l-4 4l-3 -3l4 -4l9 -11l5 0',
    'M5 13l6 6',
    'M14.32 17.32l3.68 3.68l3 -3l-3.365 -3.365',
    'M10 5.5l-2 -2.5h-5v5l3 2.5',
  ]),
  completed: tablerIcon([
    'M8 21l8 0',
    'M12 17l0 4',
    'M7 4l10 0',
    'M17 4v8a5 5 0 0 1 -10 0v-8',
    'M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  ]),
};

// Add local state for new participant
const activeParticipantIndex = ref(0);

// Modal state
const editingParticipant = ref<any>(null);
const newInitiative = ref(0);
const isAddParticipantModalOpen = ref(false);
const localParticipants = ref<
  Record<string, { selected: boolean; initiative: number }>
>({});

// Computed: current participant
const currentParticipant = computed(() => {
  if (
    !combat.value ||
    combat.value.status !== 'active' ||
    !combat.value.combatants.length
  )
    return null;
  return combat.value.combatants[activeParticipantIndex.value];
});

const encounter = computed(() =>
  combat.value ? encounterStore.getById(combat.value.encounterId) : null,
);
const party = computed(() =>
  combat.value ? partyStore.getById(combat.value.partyId) : null,
);

const partyCharacters = computed(() => {
  if (!party.value) return [];
  return party.value.characters
    .map((id) => characterStore.getById(id))
    .filter((c): c is NonNullable<typeof c> => !!c);
});

const encounterPawns = computed(() => {
  if (!encounter.value) return [];
  // encounter.value.pawns is Record<UUID, number>
  const pawns: any[] = [];
  Object.entries(encounter.value.pawns).forEach(([pawnId, count]) => {
    const pawn = pawnStore.getById(pawnId);
    if (pawn) {
      for (let i = 0; i < count; i++) {
        pawns.push({ ...pawn, instance: i + 1 });
      }
    }
  });
  return pawns;
});

const allParticipants = computed(() => {
  const players = partyCharacters.value.map((c) => ({
    id: c.id,
    type: 'player',
    referenceId: c.id,
  }));
  const pawnCombatants = encounterPawns.value.map((m) => ({
    id: m.id + (m.instance ? `-${m.instance}` : ''),
    type: 'pawn',
    referenceId: m.id,
  }));
  return [...players, ...pawnCombatants];
});

const availableCharactersToAdd = computed(() => {
  if (!combat.value) return [];
  const combatantCharacterIds = new Set(
    combat.value.combatants
      .filter((c) => c.type === 'player')
      .map((c) => c.referenceId),
  );
  return partyCharacters.value.filter((c) => !combatantCharacterIds.has(c.id));
});

// Helper to get display name for a combatant
function getCombatantDisplayName(combatant: {
  type: string;
  referenceId?: string;
  id: string;
}) {
  if (combatant.type === 'player' && combatant.referenceId) {
    const char = characterStore.getById(combatant.referenceId);
    return char ? char.name : t('combat.unknownPlayer');
  } else if (combatant.type === 'pawn' && combatant.referenceId) {
    const pawn = pawnStore.getById(combatant.referenceId);
    if (pawn) {
      // If there are multiple pawns of the same type, add a number
      const all =
        combat.value?.combatants.filter(
          (c) => c.referenceId === combatant.referenceId && c.type === 'pawn',
        ) || [];
      if (all.length > 1) {
        const idx = all.findIndex((c) => c.id === combatant.id);
        return `${pawn.name} #${idx + 1}`;
      }
      return pawn.name;
    }
    return t('combat.unknownPawn');
  }
  return t('combat.unknown');
}

function updateCombatFromStore() {
  if (!combatStore.isLoaded) return;
  const combatId = route.params.id as string;
  const found = combatStore.getById(combatId);
  if (found) {
    combat.value = found;
    if (found.status === 'active') {
      activeParticipantIndex.value = Math.min(
        found.currentTurn,
        Math.max(found.combatants.length - 1, 0),
      );
    }
  } else {
    router.push('/encounters');
  }
}

watch(
  combat,
  async (newCombat) => {
    if (
      newCombat &&
      newCombat.status === 'preparing' &&
      newCombat.combatants.length === 0 &&
      allParticipants.value.length > 0
    ) {
      const now = Date.now();
      const combatants = allParticipants.value.map((p) => ({
        id: p.id,
        type: p.type as 'player' | 'pawn',
        referenceId: p.referenceId,
        initiative: 0,
        hasActed: false,
        isPostponed: false,
        createdAt: now,
        updatedAt: now,
      }));
      const updated = await combatStore.update(newCombat.id, { combatants });
      combat.value = updated;
    }
  },
  { immediate: true },
);

watch(() => combatStore.items, updateCombatFromStore, {
  deep: true,
  immediate: true,
});

watch(isAddParticipantModalOpen, (isOpen) => {
  if (isOpen) {
    localParticipants.value = availableCharactersToAdd.value.reduce(
      (acc, p) => {
        acc[p.id] = { selected: false, initiative: 0 };
        return acc;
      },
      {} as Record<string, { selected: boolean; initiative: number }>,
    );
  }
});

const getEncounterName = (encounterId: string) => {
  const encounter = encounterStore.getById(encounterId);
  return encounter ? encounter.name : t('combat.unknownEncounter');
};

const getPartyName = (partyId: string) => {
  const party = partyStore.getById(partyId);
  return party ? party.name : t('combat.unknownParty');
};

// Computed properties for BaseEntityView
const combatTitle = computed(() => {
  if (!combat.value) return '';
  return t('combat.matchup', {
    encounter: getEncounterName(combat.value.encounterId),
    party: getPartyName(combat.value.partyId),
  });
});

// Start
function startCombat() {
  if (!combat.value || combat.value.combatants.length < 1) return;

  const updatedCombatants = combat.value.combatants
    .map((c) => ({
      ...c,
      initiative: Number(c.initiative),
      hasActed: false,
      isPostponed: false,
    }))
    .sort((a, b) => b.initiative - a.initiative);

  combatStore.update(combat.value.id, {
    status: 'active',
    currentRound: 1,
    currentTurn: 0,
    combatants: updatedCombatants,
  });

  activeParticipantIndex.value = 0;
}

// Next turn
async function persistTurnState(result: TurnResult) {
  if (!combat.value) return;
  const updated = await combatStore.update(combat.value.id, {
    combatants: result.combatants,
    currentTurn: result.currentTurn,
    currentRound: result.currentRound,
  });
  combat.value = updated;
  activeParticipantIndex.value = result.currentTurn;
}

async function nextTurn() {
  if (!combat.value || combat.value.status !== 'active') return;
  const result = advanceTurn({
    combatants: combat.value.combatants,
    currentTurn: activeParticipantIndex.value,
    currentRound: combat.value.currentRound,
  });
  await persistTurnState(result);
}

async function previousTurn() {
  if (!combat.value || combat.value.status !== 'active') return;
  const result = rewindTurn({
    combatants: combat.value.combatants,
    currentTurn: activeParticipantIndex.value,
    currentRound: combat.value.currentRound,
  });
  await persistTurnState(result);
}

// Postpone current
async function postponeCurrent() {
  if (
    !combat.value ||
    combat.value.status !== 'active' ||
    !currentParticipant.value
  )
    return;

  const combatants = combat.value.combatants.map((participant) =>
    participant.id === currentParticipant.value!.id
      ? { ...participant, isPostponed: true }
      : { ...participant },
  );
  const result = advanceTurn({
    combatants,
    currentTurn: activeParticipantIndex.value,
    currentRound: combat.value.currentRound,
  });
  await persistTurnState(result);
}

// Activate postponed
async function activatePostponed(id: string) {
  if (!combat.value) return;
  const combatants = combat.value.combatants.map((participant) =>
    participant.id === id
      ? { ...participant, isPostponed: false, hasActed: false }
      : { ...participant },
  );
  const index = combatants.findIndex((participant) => participant.id === id);
  if (index === -1) return;

  const updated = await combatStore.update(combat.value.id, { combatants });
  combat.value = updated;
  if (updated.status === 'active') {
    activeParticipantIndex.value = index;
  }
}

async function excludeParticipant(participant: Combatant, index: number) {
  if (!combat.value) return;
  const wasActive = index === activeParticipantIndex.value;
  const updated = await combatStore.removeCombatant(
    combat.value.id,
    participant.id,
  );
  if (!updated) return;

  const remaining = updated.combatants.length;
  let nextTurn = activeParticipantIndex.value;
  if (remaining === 0) {
    nextTurn = 0;
  } else if (wasActive) {
    nextTurn = Math.min(index, remaining - 1);
  } else if (index < nextTurn) {
    nextTurn -= 1;
  }

  const withTurn = await combatStore.update(combat.value.id, {
    currentTurn: nextTurn,
  });
  combat.value = withTurn;
  activeParticipantIndex.value = nextTurn;
}

async function persistCombatants() {
  if (!combat.value) return;
  const updated = await combatStore.update(combat.value.id, {
    combatants: combat.value.combatants,
  });
  combat.value = updated;
}

// End battle
function endCombat() {
  if (!combat.value) return;
  combatStore.endCombat(combat.value.id);
}

function saveInitiative() {
  if (
    !combat.value ||
    !editingParticipant.value ||
    combat.value.status !== 'preparing'
  )
    return;
  const combatants = [...combat.value.combatants];
  const pIndex = combatants.findIndex(
    (p) => p.id === editingParticipant.value.id,
  );

  if (pIndex > -1) {
    combatants[pIndex] = {
      ...combatants[pIndex],
      initiative: Number(newInitiative.value),
      updatedAt: Date.now(),
    };
    combatStore.update(combat.value.id, { combatants });
  }

  editingParticipant.value = null;
}

function handleParticipantToggle(participantId: string, isSelected: boolean) {
  if (localParticipants.value[participantId]) {
    localParticipants.value[participantId].selected = isSelected;
  }
}

function handleInitiativeChange(participantId: string, initiative: number) {
  if (localParticipants.value[participantId]) {
    localParticipants.value[participantId].initiative = Number(initiative);
  }
}

function handleAddParticipants() {
  if (!combat.value) return;

  const now = Date.now();
  const newCombatants = Object.entries(localParticipants.value)
    .filter(([, data]) => data.selected)
    .map(([characterId, data]) => ({
      id: characterId,
      type: 'player' as const,
      referenceId: characterId,
      initiative: Number(data.initiative),
      hasActed: false,
      isPostponed: false,
      createdAt: now,
      updatedAt: now,
    }));

  if (newCombatants.length > 0) {
    const updatedCombatants = [...combat.value.combatants, ...newCombatants];
    combatStore.update(combat.value.id, { combatants: updatedCombatants });
  }

  isAddParticipantModalOpen.value = false;
}

const validateInitiative = (val: any) => Number.isInteger(Number(val));
</script>

<template>
  <BaseEntityView
    :entity="combat"
    entity-name="Combat"
    list-route="/encounters"
    :title="combatTitle"
    :not-found="notFound"
    :loading="loading"
    :headerShowEdit="false"
    :headerShowDelete="false"
    :headerButtons="
      combat && combat.status === 'preparing'
        ? [
            {
              event: startCombat,
              color: 'warning',
              disabled: combat.combatants.length < 1,
              icon: IconSwords,
              title: 'combat.start',
            },
          ]
        : combat && combat.status === 'active'
          ? [
              {
                event: endCombat,
                color: 'negative',
                icon: IconFlag,
                title: 'combat.end',
              },
            ]
          : []
    "
  >
    <!-- Combat Content -->
    <div v-if="combat" class="q-pa-md q-gutter-md">
      <!-- Phase Tabs and Round/Turn Display -->
      <QStepper
        :model-value="activeTab"
        flat
        :header-nav="false"
        class="phase-stepper"
      >
        <QStep
          name="preparing"
          :title="t('combat.phases.preparing')"
          :icon="phaseIcons.preparing"
          :active-icon="phaseIcons.preparing"
          :done-icon="phaseIcons.preparing"
        />
        <QStep
          name="active"
          :title="t('combat.phases.active')"
          :icon="phaseIcons.active"
          :active-icon="phaseIcons.active"
          :done-icon="phaseIcons.active"
        />
        <QStep
          name="completed"
          :title="t('combat.phases.completed')"
          :icon="phaseIcons.completed"
          :active-icon="phaseIcons.completed"
          :done-icon="phaseIcons.completed"
        />
      </QStepper>

      <!-- Combat Summary -->
      <div v-if="combat?.status === 'active'" class="q-mb-md">
        <h3>{{ t('combat.summary') }}</h3>
        <div class="row q-gutter-md">
          <div class="col-12 col-md-6">
            <label>{{ t('combat.round') }}</label>
            <span>{{ combat?.currentRound }}</span>
          </div>
          <div class="col-12 col-md-6">
            <label>{{ t('combat.turn') }}</label>
            <span>{{
              t('combat.turnProgress', {
                current: (combat?.currentTurn ?? 0) + 1,
                total: combat?.combatants?.length ?? 0,
              })
            }}</span>
          </div>
        </div>
      </div>

      <!-- Ended State -->
      <div
        v-if="combat && combat.status === 'completed'"
        class="q-pa-md text-grey text-center q-mt-xl"
      >
        <IconFlag />
        {{
          t('combat.concluded', {
            rounds: combat.currentRound,
          })
        }}
      </div>

      <!-- Participants Section -->
      <div class="participants-section">
        <div class="combat-title row justify-between q-pa-md">
          <h2>
            {{
              t('combat.participantsCount', {
                count: combat.combatants.length,
              })
            }}
          </h2>

          <Button
            v-if="
              combat &&
              (combat.status === 'preparing' || combat.status === 'active')
            "
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
          <QList bordered separator class="rounded-borders">
            <QItem
              v-for="(participant, index) in combat.combatants"
              :clickable="combat.status === 'preparing'"
              :key="participant.id"
              :active="
                combat &&
                combat.status === 'active' &&
                activeParticipantIndex === index
              "
              :active-class="'bg-secondary'"
              :class="{
                'participant-row': true,
                preparing: combat && combat.status === 'preparing',
                postponed: participant.isPostponed,
                acted:
                  combat &&
                  combat.status === 'active' &&
                  participant.hasActed &&
                  !participant.isPostponed,
              }"
            >
              <QPopupEdit
                v-if="combat.status === 'preparing'"
                v-model="participant.initiative"
                auto-save
                v-slot="scope"
                buttons
                :validate="validateInitiative"
                @save="persistCombatants"
              >
                <QInput
                  v-model="scope.value"
                  dense
                  autofocus
                  counter
                  @keyup.enter="scope.set"
                />
              </QPopupEdit>

              <QItemSection avatar class="participant-artwork">
                <IconUser v-if="participant.type === 'player'" />
                <IconGhost3 v-else />
              </QItemSection>

              <QItemSection side class="participant-initiative">
                {{ participant.initiative }}
              </QItemSection>

              <QItemSection class="participant-name">
                {{ getCombatantDisplayName(participant) }}
              </QItemSection>

              <QItemSection
                side
                class="participant-status"
                v-if="combat && combat.status === 'active'"
              >
                <span
                  v-if="!participant.isPostponed && participant.hasActed"
                  class="participant-badge badge-acted"
                  :aria-label="t('combat.participantStatus.actedThisRound')"
                  :title="t('combat.participantStatus.actedThisRound')"
                >
                  <IconCircleCheck />
                </span>
                <span
                  v-else-if="
                    !participant.isPostponed && activeParticipantIndex !== index
                  "
                  class="participant-wait"
                >
                  <CombatWaitIcon :label="t('combat.participantStatus.wait')" />
                </span>
              </QItemSection>

              <QItemSection
                side
                v-if="combat && combat.status === 'active'"
                class="participant-actions"
              >
                <QBtnGroup v-if="participant.isPostponed" flat class="controls">
                  <QBtn
                    :color="'info'"
                    :size="'lg'"
                    :title="t('combat.activatePostponed')"
                    :aria-label="t('combat.activatePostponed')"
                    @click="activatePostponed(participant.id)"
                  >
                    <IconBolt />
                  </QBtn>
                </QBtnGroup>

                <QBtnGroup
                  flat
                  class="controls"
                  v-if="activeParticipantIndex === index"
                >
                  <QBtn
                    :size="'lg'"
                    :color="'warning'"
                    :title="t('combat.postpone')"
                    :aria-label="t('combat.postpone')"
                    @click="postponeCurrent"
                    v-if="index !== combat.combatants.length - 1"
                  >
                    <IconPlayerPause />
                  </QBtn>
                  <QBtn
                    :size="'lg'"
                    :color="'positive'"
                    :title="t('combat.nextTurn')"
                    :aria-label="t('combat.nextTurn')"
                    @click="nextTurn"
                    :disabled="!currentParticipant"
                  >
                    <IconCheck />
                  </QBtn>
                </QBtnGroup>

                <QBtnGroup flat class="controls participant-exclude">
                  <QBtn
                    :size="'lg'"
                    color="negative"
                    :title="t('combat.excludeParticipant')"
                    :aria-label="t('combat.excludeParticipant')"
                    @click.stop="excludeParticipant(participant, index)"
                  >
                    <IconX />
                  </QBtn>
                </QBtnGroup>
              </QItemSection>
            </QItem>
          </QList>
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
      :is-open="isAddParticipantModalOpen"
      @cancel="isAddParticipantModalOpen = false"
      @submit="handleAddParticipants"
      :title="t('combat.addParticipantTitle')"
      modal-id="add-participant-modal"
      :show-submit="true"
      :show-cancel="true"
      :submit-label="t('common.add')"
      :cancel-label="t('common.cancel')"
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
                @update:model-value="
                  (val) => handleParticipantToggle(p.id, val)
                "
              />
            </td>
            <td>
              <QInput
                v-if="localParticipants[p.id]?.selected"
                type="number"
                class="initiative-input"
                v-model.number="localParticipants[p.id].initiative"
                @update:model-value="
                  (val) => handleInitiativeChange(p.id, Number(val ?? 0))
                "
                dense
                outlined
              />
            </td>
          </tr>
        </tbody>
      </table>
    </BaseModal>
  </BaseEntityView>
</template>

<style scoped>
.participant-status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
}

.participant-row {
  min-height: 69px;
}

.participant-badge,
.participant-wait {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 52px;
}

.participant-wait :deep(.combat-wait-icon) {
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.participant-actions :deep(.q-btn) {
  height: 52px;
}

.participant-actions {
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
}
</style>
