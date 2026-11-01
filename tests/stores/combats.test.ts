import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCombatStore } from '@/stores/combats';
import { resetMockStores } from '../helpers/mock-storage';
import type { Combatant } from '@/types';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

const combatant = (id: string, initiative: number): Combatant => ({
  id,
  type: 'player',
  initiative,
  hasActed: false,
  isPostponed: false,
  createdAt: 0,
  updatedAt: 0,
});

describe('combat store', () => {
  beforeEach(() => {
    resetMockStores();
    setActivePinia(createPinia());
  });

  async function createCombat() {
    const store = useCombatStore();
    const combat = await store.create({
      encounterId: 'e1',
      partyId: 'p1',
      status: 'preparing',
      currentRound: 0,
      currentTurn: 0,
      combatants: [combatant('a', 10), combatant('b', 5)],
    });
    return { store, combat };
  }

  it('starts, advances, rewinds, and ends a combat', async () => {
    const { store, combat } = await createCombat();
    await store.startCombat(combat.id);
    expect(store.getById(combat.id)?.status).toBe('active');
    expect(store.getById(combat.id)?.currentRound).toBe(1);

    await store.nextTurn(combat.id);
    expect(store.getById(combat.id)?.currentTurn).toBe(1);

    await store.previousTurn(combat.id);
    expect(store.getById(combat.id)?.currentTurn).toBe(0);

    await store.endCombat(combat.id);
    expect(store.getById(combat.id)?.status).toBe('completed');
  });

  it('updates and removes combatants', async () => {
    const { store, combat } = await createCombat();
    await store.updateCombatant(combat.id, 'a', { hasActed: true });
    expect(store.getById(combat.id)?.combatants[0].hasActed).toBe(true);

    await store.removeCombatant(combat.id, 'b');
    expect(store.getById(combat.id)?.combatants).toHaveLength(1);
  });

  it('looks up combats by encounter and party', async () => {
    const { store, combat } = await createCombat();
    expect(store.getCombatByEncounter('e1')?.id).toBe(combat.id);
    expect(store.getCombatByParty('p1')).toHaveLength(1);
  });
});
