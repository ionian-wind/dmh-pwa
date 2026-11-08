<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconBolt,
  IconCheck,
  IconFlag,
  IconGhost3,
  IconPlayerPause,
  IconRestore,
  IconUser,
  IconX,
} from '@tabler/icons-vue';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { useCharacterStore } from '@/stores/characters';
import { usePawnStore } from '@/stores/pawns';
import EntityGroup from '@/components/common/EntityGroup.vue';
import EntityInfoDialog from '@/components/common/EntityInfoDialog.vue';
import EntityPicture from '@/components/common/EntityPicture.vue';
import { advanceTurn } from '@/utils/combatTurn';
import { useVisibleActiveCombats } from '@/encounters/useVisibleActiveCombats';
import type { Combat, Combatant } from '@/types';

const props = withDefaults(
  defineProps<{
    onNavigate?: () => void;
  }>(),
  { onNavigate: undefined },
);

const { t } = useI18n();
const combatStore = useCombatStore();
const encounterStore = useEncounterStore();
const characterStore = useCharacterStore();
const pawnStore = usePawnStore();
const { visibleActiveCombats: activeCombats } = useVisibleActiveCombats();
const selectedParticipant = ref<Combatant | null>(null);

function encounterName(combat: Combat) {
  return (
    encounterStore.getById(combat.encounterId)?.name ??
    t('combat.unknownEncounter')
  );
}

function combatantName(combat: Combat, combatant: Combatant) {
  if (combatant.type === 'player' && combatant.referenceId) {
    const character = characterStore.getById(combatant.referenceId);
    return character ? character.name : t('combat.unknownPlayer');
  }
  if (combatant.type === 'pawn' && combatant.referenceId) {
    const pawn = pawnStore.getById(combatant.referenceId);
    if (!pawn) return t('combat.unknownPawn');
    const all = combat.combatants.filter(
      (entry) =>
        entry.referenceId === combatant.referenceId && entry.type === 'pawn',
    );
    if (all.length > 1) {
      const index = all.findIndex((entry) => entry.id === combatant.id);
      return `${pawn.name} #${index + 1}`;
    }
    return pawn.name;
  }
  return t('combat.unknown');
}

function participantEntity(combatant: Combatant) {
  if (!combatant.referenceId) return null;
  return combatant.type === 'player'
    ? characterStore.getById(combatant.referenceId)
    : pawnStore.getById(combatant.referenceId);
}

function participantPicture(combatant: Combatant) {
  return participantEntity(combatant)?.picture ?? null;
}

function openParticipantInfo(combatant: Combatant) {
  if (!participantEntity(combatant)) return;
  selectedParticipant.value = combatant;
}

const selectedParticipantTitle = computed(() => {
  const participant = selectedParticipant.value;
  if (!participant) return '';
  const combat = activeCombats.value.find((entry) =>
    entry.combatants.some((combatant) => combatant.id === participant.id),
  );
  return combat
    ? combatantName(combat, participant)
    : (participant.referenceId ?? '');
});

const selectedParticipantPicture = computed(() =>
  selectedParticipant.value
    ? participantPicture(selectedParticipant.value)
    : null,
);
const selectedParticipantNotes = computed(() => {
  const participant = selectedParticipant.value;
  return participant ? (participantEntity(participant)?.notes ?? '') : '';
});

async function advance(combat: Combat) {
  const result = advanceTurn(combat);
  await combatStore.update(combat.id, {
    combatants: result.combatants,
    currentTurn: result.currentTurn,
    currentRound: result.currentRound,
  });
}

async function postpone(combat: Combat) {
  const current = combat.combatants[combat.currentTurn];
  if (!current) return;
  const combatants = combat.combatants.map((combatant, index) =>
    index === combat.currentTurn
      ? { ...combatant, isPostponed: true }
      : { ...combatant },
  );
  const result = advanceTurn({ ...combat, combatants });
  await combatStore.update(combat.id, {
    combatants: result.combatants,
    currentTurn: result.currentTurn,
    currentRound: result.currentRound,
  });
}

async function activate(combat: Combat, index: number) {
  const combatants = combat.combatants.map((entry, entryIndex) =>
    entryIndex === index
      ? { ...entry, isPostponed: false, hasActed: false }
      : { ...entry },
  );
  await combatStore.update(combat.id, {
    combatants,
    currentTurn: index,
    currentRound: combat.currentRound,
  });
}

async function exclude(combat: Combat, combatant: Combatant, index: number) {
  await setParticipantExcluded(combat, index, true);
}

async function returnParticipant(combat: Combat, index: number) {
  await setParticipantExcluded(combat, index, false);
}

async function setParticipantExcluded(
  combat: Combat,
  index: number,
  excluded: boolean,
) {
  const combatants = combat.combatants.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, isExcluded: excluded } : { ...entry },
  );

  if (excluded && index === combat.currentTurn) {
    const result = advanceTurn({ ...combat, combatants });
    await combatStore.update(combat.id, {
      combatants: result.combatants,
      currentTurn: result.currentTurn,
      currentRound: result.currentRound,
    });
    return;
  }

  await combatStore.update(combat.id, {
    combatants,
    currentTurn: combat.currentTurn,
    currentRound: combat.currentRound,
  });
}

function finish(combat: Combat) {
  void combatStore.endCombat(combat.id);
}

onMounted(async () => {
  await Promise.all([
    combatStore.isLoaded ? Promise.resolve() : combatStore.load(),
    encounterStore.isLoaded ? Promise.resolve() : encounterStore.load(),
    characterStore.isLoaded ? Promise.resolve() : characterStore.load(),
    pawnStore.isLoaded ? Promise.resolve() : pawnStore.load(),
  ]);
});
</script>

<template>
  <div class="side-panel-content column full-height q-pa-md">
    <QScrollArea class="col-grow">
      <div
        v-if="!activeCombats.length"
        class="text-caption text-grey-7 q-pa-sm"
      >
        {{ t('combat.noActiveCombats') }}
      </div>

      <EntityGroup
        v-for="combat in activeCombats"
        :key="combat.id"
        :title="encounterName(combat)"
        class="combat-group"
      >
        <template #actions>
          <QBtn
            class="view-combat-button"
            flat
            dense
            color="primary"
            :to="`/combats/${combat.id}`"
            :label="t('common.view')"
            @click="props.onNavigate?.()"
          />
          <QBtn
            class="finish-combat-button"
            flat
            dense
            color="negative"
            :title="t('combat.finish')"
            :aria-label="t('combat.finish')"
            @click="finish(combat)"
          >
            <IconFlag :size="18" />
          </QBtn>
        </template>

        <QList class="q-pa-none">
          <QItem
            v-for="(combatant, index) in combat.combatants"
            :key="combatant.id"
            class="combat-participant-row"
            :class="{
              'is-active-turn': index === combat.currentTurn,
              excluded: combatant.isExcluded,
            }"
          >
            <QItemSection side>
              <EntityPicture
                v-if="participantPicture(combatant)"
                :picture="participantPicture(combatant)"
                size="28px"
                :alt="combatantName(combat, combatant)"
              />
              <IconUser v-else-if="combatant.type === 'player'" :size="18" />
              <IconGhost3 v-else :size="18" />
            </QItemSection>
            <QItemSection side class="combat-participant-initiative">
              {{ combatant.initiative }}
            </QItemSection>
            <QItemSection
              class="combat-participant-name"
              :class="{
                'combat-participant-name--clickable':
                  !!participantEntity(combatant),
              }"
              :title="
                participantEntity(combatant) ? t('common.view') : undefined
              "
              @click.stop="openParticipantInfo(combatant)"
            >
              {{ combatantName(combat, combatant) }}
            </QItemSection>
            <QItemSection side class="combat-participant-actions">
              <QBtnGroup flat class="combat-participant-actions-group">
                <QBtn
                  v-if="combatant.isPostponed && !combatant.isExcluded"
                  class="activate-participant-button"
                  flat
                  dense
                  color="info"
                  :title="t('combat.activatePostponed')"
                  :aria-label="t('combat.activatePostponed')"
                  @click="activate(combat, index)"
                >
                  <IconBolt :size="18" />
                </QBtn>
                <template
                  v-if="index === combat.currentTurn && !combatant.isExcluded"
                >
                  <QBtn
                    class="postpone-turn-button"
                    flat
                    dense
                    color="warning"
                    :title="t('combat.postpone')"
                    :aria-label="t('combat.postpone')"
                    @click="postpone(combat)"
                  >
                    <IconPlayerPause :size="18" />
                  </QBtn>
                  <QBtn
                    flat
                    dense
                    color="positive"
                    :title="t('combat.nextTurn')"
                    :aria-label="t('combat.nextTurn')"
                    @click="advance(combat)"
                  >
                    <IconCheck :size="18" />
                  </QBtn>
                </template>
                <QBtn
                  v-if="combatant.isExcluded"
                  class="return-participant-button"
                  flat
                  dense
                  :title="t('combat.returnParticipant')"
                  :aria-label="t('combat.returnParticipant')"
                  @click="returnParticipant(combat, index)"
                >
                  <IconRestore :size="18" />
                </QBtn>
                <QBtn
                  v-else
                  class="exclude-participant-button"
                  flat
                  dense
                  color="negative"
                  :title="t('combat.excludeParticipant')"
                  :aria-label="t('combat.excludeParticipant')"
                  @click="exclude(combat, combatant, index)"
                >
                  <IconX :size="18" />
                </QBtn>
              </QBtnGroup>
            </QItemSection>
          </QItem>
        </QList>
      </EntityGroup>
    </QScrollArea>

    <EntityInfoDialog
      :is-open="!!selectedParticipant"
      :title="selectedParticipantTitle"
      :picture="selectedParticipantPicture"
      :notes="selectedParticipantNotes"
      @cancel="selectedParticipant = null"
    />
  </div>
</template>

<style scoped>
.combat-participant-row.is-active-turn {
  background: var(--color-selected-surface);
}

.combat-participant-row.excluded {
  opacity: 0.55;
}

.return-participant-button {
  color: var(--color-accent);
}

.combat-participant-initiative {
  min-width: 24px;
  color: var(--color-text-light);
}

.combat-participant-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.combat-participant-name--clickable {
  cursor: pointer;
}

.combat-participant-name--clickable:hover {
  color: var(--color-accent);
}

.combat-participant-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.15rem;
}
</style>
