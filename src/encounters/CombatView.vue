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
import { useCharacterStore } from '@/stores/characters';
import { useMonsterStore } from '@/stores/monsters';
import BaseModal from '@/components/common/BaseModal.vue';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';
import {
  IconFlag,
  IconGhost3,
  IconListNumbers,
  IconUserPlus,
  IconUser,
  IconCheck,
  IconBolt,
  IconPlayerPause,
  IconSwords,
  IconTrophy,
  IconCircleCheck,
  IconClock,
} from '@tabler/icons-vue';
import {S} from "@/utils/dice-roller/plugins/dice/tokens";

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
const activeTab = computed(() => combat.value?.status ?? null);

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
  const players = partyCharacters.value.map((c) => ({
    id: c.id,
    type: 'player',
    referenceId: c.id,
  }));
  const monsters = encounterMonsters.value.map((m) => ({
    id: m.id + (m.instance ? `-${m.instance}` : ''),
    type: 'monster',
    referenceId: m.id,
  }));
  return [...players, ...monsters];
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
    return char ? char.name : 'Unknown Player';
  } else if (combatant.type === 'monster' && combatant.referenceId) {
    const monster = monsterStore.getById(combatant.referenceId);
    if (monster) {
      // If there are multiple monsters of the same type, add a number
      const all =
        combat.value?.combatants.filter(
          (c) =>
            c.referenceId === combatant.referenceId && c.type === 'monster',
        ) || [];
      if (all.length > 1) {
        const idx = all.findIndex((c) => c.id === combatant.id);
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

watch(
  combat,
  (newCombat) => {
    if (
      newCombat &&
      newCombat.status === 'preparing' &&
      newCombat.combatants.length === 0 &&
      allParticipants.value.length > 0
    ) {
      const now = Date.now();
      newCombat.combatants = allParticipants.value.map((p) => ({
        id: p.id,
        type: p.type as 'player' | 'monster',
        referenceId: p.referenceId,
        initiative: 0,
        hasActed: false,
        isPostponed: false,
        createdAt: now,
        updatedAt: now,
      }));
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
function nextTurn() {
  if (!combat.value || combat.value.status !== 'active') return;
  if (currentParticipant.value) {
    currentParticipant.value.hasActed = true;
  }
  let nextIndex = -1;
  for (
    let i = activeParticipantIndex.value + 1;
    i < combat.value.combatants.length;
    i++
  ) {
    if (
      !combat.value.combatants[i].hasActed &&
      !combat.value.combatants[i].isPostponed
    ) {
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
  combat.value.combatants.forEach((p) => {
    p.hasActed = false;
    p.isPostponed = false;
  });
  activeParticipantIndex.value = 0;
}

// Postpone current
function postponeCurrent() {
  if (
    !combat.value ||
    combat.value.status !== 'active' ||
    !currentParticipant.value
  )
    return;
  currentParticipant.value.isPostponed = true;
  nextTurn();
}

// Activate postponed
function activatePostponed(id: string) {
  if (!combat.value) return;
  const participant = combat.value.combatants.find((p) => p.id === id);
  if (!participant) return;
  participant.isPostponed = false;
  participant.hasActed = false;
  if (combat.value.status === 'active') {
    const index = combat.value.combatants.findIndex((p) => p.id === id);
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
    console.log(localParticipants.value[participantId]);
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
    list-route="/combats"
    :title="combatTitle"
    :not-found="notFound"
    :loading="loading"
    :headerShowEdit="false"
    :headerShowDelete="false"
    :headerButtons="
      combat && combat.status === 'preparing' 
      ? [{
        event: startCombat,
        color: 'warning',
        disabled: combat.combatants.length < 1,
        icon: IconSwords,
        title: 'Start',
      }]
      : (combat && combat.status === 'active' 
      ? [{
        event: endCombat,
        color: 'negative',
        icon: IconFlag,
        title: 'End',
      }]
      : [])"
  >
    <!-- Combat Content -->
    <div v-if="combat" class="q-pa-md q-gutter-md">
      <!-- Phase Tabs and Round/Turn Display -->
      <QTabs v-model="activeTab" class="phase-indicator">
        <QTab class="phase-tab" name="preparing">
          <IconListNumbers /> Preparation
        </QTab>
        <QTab class="phase-tab" name="active">
          <IconSwords /> Active
        </QTab>
        <QTab class="phase-tab" name="completed">
          <IconTrophy /> Ended
        </QTab>
      </QTabs>

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
            <span
              >{{ (combat?.currentTurn ?? 0) + 1 }} of
              {{ combat?.combatants?.length ?? 0 }}</span
            >
          </div>
        </div>
      </div>

      <!-- Ended State -->
      <div
        v-if="combat && combat.status === 'completed'"
        class="q-pa-md text-grey text-center q-mt-xl"
      >
        <IconFlag /> The encounter has concluded after
        {{ combat.currentRound }} rounds.
      </div>

      <!-- Participants Section -->
      <div class="participants-section">
        <div class="combat-title row justify-between q-pa-md">
          <h2>Participants: {{ combat.combatants.length }}</h2>
          
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
              :active="combat &&
                combat.status === 'active' &&
                activeParticipantIndex === index"
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
                @hide="validateInitiative"
              >
                <QInput v-model="scope.value" dense autofocus counter @keyup.enter="scope.set" />
              </QPopupEdit>

              <QItemSection avatar class="participant-artwork">
                <IconUser v-if="participant.type === 'player'" />
                <IconGhost3 v-else />
              </QItemSection>

              <QItemSection class="participant-name">
                {{ getCombatantDisplayName(participant) }}
              </QItemSection>
              <QItemSection side class="participant-initiative">
                {{ participant.initiative }}
              </QItemSection>

              <QItemSection side class="participant-status" v-if="combat && combat.status === 'active'">
                <span
                  v-if="!participant.isPostponed && participant.hasActed"
                  class="participant-badge badge-acted"
                  :aria-label="t('combat.participantStatus.actedThisRound')"
                  :title="t('combat.participantStatus.actedThisRound')"
                >
                    <IconCircleCheck />
                  </span>
                <span v-else-if="!participant.isPostponed && activeParticipantIndex !== index">
                  <IconClock
                    :aria-label="t('combat.participantStatus.wait')"
                    :title="t('combat.participantStatus.wait')"
                  />
                </span>
              </QItemSection>

              <QItemSection side v-if="combat && combat.status === 'active'" class="participant-actions">
                <QBtnGroup
                  v-if="participant.isPostponed"
                  flat
                  class="controls"
                >
                  <QBtn
                    :color="'info'"
                    :size="'lg'"
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
                    @click="postponeCurrent"
                    v-if="index !== (combat.combatants.length - 1)"
                  >
                    <IconPlayerPause />
                  </QBtn>
                  <QBtn
                    :size="'lg'"
                    :color="'positive'"
                    @click="nextTurn"
                    :disabled="!currentParticipant"
                  >
                    <IconCheck />
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
                  (val) => handleInitiativeChange(p.id, val)
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
