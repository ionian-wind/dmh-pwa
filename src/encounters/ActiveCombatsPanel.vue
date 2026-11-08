<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconCheck,
  IconGhost3,
  IconSwords,
  IconUser,
  IconX,
} from '@tabler/icons-vue';
import { useCombatStore } from '@/stores/combats';
import { useEncounterStore } from '@/stores/encounters';
import { useCharacterStore } from '@/stores/characters';
import { usePawnStore } from '@/stores/pawns';
import { advanceTurn } from '@/utils/combatTurn';
import { useVisibleActiveCombats } from '@/encounters/useVisibleActiveCombats';
import type { Combat, Combatant } from '@/types';

const props = defineProps<{
  onClose?: () => void;
}>();

const { t } = useI18n();
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
  <div class="side-panel-content column full-height">
    <div class="row items-center justify-between q-pa-md">
      <div class="row items-center q-gutter-sm">
        <IconSwords :size="20" class="text-warning" />
        <span class="text-subtitle1">{{ t('combat.activeEncounters') }}</span>
      </div>
      <QBtn
        flat
        round
        dense
        :title="t('common.close')"
        :aria-label="t('common.close')"
        @click="props.onClose?.()"
      >
        <IconX :size="18" />
      </QBtn>
    </div>

    <QSeparator />

    <QScrollArea class="col-grow">
      <div
        v-if="!activeCombats.length"
        class="text-caption text-grey-7 q-pa-md"
      >
        {{ t('combat.noActiveCombats') }}
      </div>

      <QList v-for="combat in activeCombats" :key="combat.id" class="q-pa-none">
        <QItem class="combat-group-title">
          <QItemSection>
            <div class="text-subtitle2">{{ encounterName(combat) }}</div>
          </QItemSection>
          <QItemSection side>
            <QBtn
              class="finish-combat-button"
              color="positive"
              size="sm"
              :title="t('combat.finish')"
              :aria-label="t('combat.finish')"
              @click="finish(combat)"
            >
              {{ t('combat.finish') }}
            </QBtn>
          </QItemSection>
        </QItem>

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
            <QBtn
              v-if="index === combat.currentTurn"
              flat
              dense
              color="positive"
              :title="t('combat.nextTurn')"
              :aria-label="t('combat.nextTurn')"
              @click="advance(combat)"
            >
              <IconCheck :size="18" />
            </QBtn>
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

        <QSeparator />
      </QList>
    </QScrollArea>
  </div>
</template>

<style scoped>
.combat-group-title {
  background: var(--color-background-soft);
  font-weight: 500;
}

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
  gap: 0.15rem;
}
</style>
