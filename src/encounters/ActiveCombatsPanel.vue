<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import {
  IconCheck,
  IconEye,
  IconFlag,
  IconGhost3,
  IconPlayerPause,
  IconUser,
  IconX,
} from '@tabler/icons-vue';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { useCharacterStore } from '@/stores/characters';
import { usePawnStore } from '@/stores/pawns';
import EntityGroup from '@/components/common/EntityGroup.vue';
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
const router = useRouter();
const combatStore = useCombatStore();
const encounterStore = useEncounterStore();
const characterStore = useCharacterStore();
const pawnStore = usePawnStore();
const { visibleActiveCombats: activeCombats } = useVisibleActiveCombats();

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

async function exclude(combat: Combat, combatant: Combatant, index: number) {
  const wasActive = index === combat.currentTurn;
  const updated = await combatStore.removeCombatant(combat.id, combatant.id);
  if (!updated) return;

  const remaining = updated.combatants.length;
  let nextTurn = combat.currentTurn;
  if (remaining === 0) {
    nextTurn = 0;
  } else if (wasActive) {
    nextTurn = Math.min(index, remaining - 1);
  } else if (index < nextTurn) {
    nextTurn -= 1;
  }
  await combatStore.update(combat.id, { currentTurn: nextTurn });
}

function finish(combat: Combat) {
  void combatStore.endCombat(combat.id);
}

function viewCombat(combat: Combat) {
  props.onNavigate?.();
  void router.push(`/combats/${combat.id}`);
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
            :title="t('common.view')"
            :aria-label="t('common.view')"
            @click="viewCombat(combat)"
          >
            <IconEye :size="18" />
          </QBtn>
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
            :class="{ 'is-active-turn': index === combat.currentTurn }"
          >
            <QItemSection side>
              <IconUser v-if="combatant.type === 'player'" :size="18" />
              <IconGhost3 v-else :size="18" />
            </QItemSection>
            <QItemSection side class="combat-participant-initiative">
              {{ combatant.initiative }}
            </QItemSection>
            <QItemSection class="combat-participant-name">
              {{ combatantName(combat, combatant) }}
            </QItemSection>
            <QItemSection side class="combat-participant-actions">
              <template v-if="index === combat.currentTurn">
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
            </QItemSection>
          </QItem>
        </QList>
      </EntityGroup>
    </QScrollArea>
  </div>
</template>

<style scoped>
.combat-participant-row.is-active-turn {
  background: var(--color-selected-surface);
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

.combat-participant-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.15rem;
}
</style>
