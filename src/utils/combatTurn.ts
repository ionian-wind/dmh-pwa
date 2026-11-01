import type { Combat, Combatant } from '@/types';

export interface TurnState {
  combatants: Combatant[];
  currentTurn: number;
  currentRound: number;
}

export interface TurnResult extends TurnState {}

function cloneCombatants(combatants: Combatant[]): Combatant[] {
  return combatants.map((combatant) => ({ ...combatant }));
}

function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => b.initiative - a.initiative);
}

function startNextRound(
  combatants: Combatant[],
  currentRound: number,
): TurnResult {
  return {
    combatants: sortByInitiative(combatants).map((combatant) => ({
      ...combatant,
      hasActed: false,
      isPostponed: false,
    })),
    currentTurn: 0,
    currentRound: currentRound + 1,
  };
}

/**
 * Advance to the next available combatant. If everyone has acted (or is
 * postponed), start a new round and reset acted/postponed flags.
 */
export function advanceTurn(combat: TurnState): TurnResult {
  const combatants = cloneCombatants(combat.combatants);

  if (combatants.length === 0) {
    return {
      combatants,
      currentTurn: 0,
      currentRound: Math.max(1, combat.currentRound),
    };
  }

  const currentTurn = Math.min(
    Math.max(combat.currentTurn, 0),
    combatants.length - 1,
  );
  const current = combatants[currentTurn];
  if (current && !current.isPostponed) {
    current.hasActed = true;
  }

  let nextTurn = -1;
  for (let i = currentTurn + 1; i < combatants.length; i++) {
    if (!combatants[i].hasActed && !combatants[i].isPostponed) {
      nextTurn = i;
      break;
    }
  }

  if (nextTurn === -1) {
    return startNextRound(combatants, combat.currentRound);
  }

  return {
    combatants,
    currentTurn: nextTurn,
    currentRound: combat.currentRound,
  };
}

/**
 * Rewind one turn, wrapping to the previous round. The combatant we land on is
 * marked as not having acted so the UI can replay the turn.
 */
export function rewindTurn(combat: TurnState): TurnResult {
  const combatants = cloneCombatants(combat.combatants);
  if (combatants.length === 0) {
    return {
      combatants,
      currentTurn: 0,
      currentRound: Math.max(1, combat.currentRound),
    };
  }

  const currentTurn = Math.min(
    Math.max(combat.currentTurn, 0),
    combatants.length - 1,
  );
  let previousTurn = currentTurn - 1;
  let currentRound = combat.currentRound;

  if (previousTurn < 0) {
    previousTurn = combatants.length - 1;
    currentRound = Math.max(1, currentRound - 1);
  }

  const previous = combatants[previousTurn];
  if (previous) {
    previous.hasActed = false;
  }

  return { combatants, currentTurn: previousTurn, currentRound };
}
