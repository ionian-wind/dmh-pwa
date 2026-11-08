import { describe, expect, it } from 'vitest';
import { advanceTurn, rewindTurn } from '@/utils/combatTurn';
import type { Combatant } from '@/types';

function combatant(
  id: string,
  initiative: number,
  overrides: Partial<Combatant> = {},
): Combatant {
  return {
    id,
    type: 'player',
    referenceId: id,
    notes: '',
    initiative,
    hasActed: false,
    isPostponed: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('combat turn exclusions', () => {
  it('skips excluded combatants when advancing', () => {
    const result = advanceTurn({
      combatants: [
        combatant('a', 30),
        combatant('b', 20, { isExcluded: true }),
        combatant('c', 10),
      ],
      currentTurn: 0,
      currentRound: 1,
    });

    expect(result.currentTurn).toBe(2);
  });

  it('starts a new round on the first non-excluded combatant', () => {
    const result = advanceTurn({
      combatants: [
        combatant('a', 30, { hasActed: true }),
        combatant('b', 20, { isExcluded: true }),
        combatant('c', 10, { isExcluded: true }),
      ],
      currentTurn: 0,
      currentRound: 1,
    });

    expect(result.currentRound).toBe(2);
    expect(result.currentTurn).toBe(0);
    expect(result.combatants[0].hasActed).toBe(false);
  });

  it('skips excluded combatants when rewinding', () => {
    const result = rewindTurn({
      combatants: [
        combatant('a', 30),
        combatant('b', 20, { isExcluded: true }),
        combatant('c', 10),
      ],
      currentTurn: 2,
      currentRound: 1,
    });

    expect(result.currentTurn).toBe(0);
  });
});
