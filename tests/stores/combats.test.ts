import { setActivePinia, createPinia } from 'pinia';
import { useCombatStore } from '@/stores/combats';
jest.mock('@/utils/storage', () => ({
  useStorage: jest.fn(() => ({ value: [] })),
  generateId: jest.fn(() => 'test-uuid-combat')
}));
jest.mock('@/stores/modules', () => ({ useModuleStore: () => ({ matchesModuleFilter: () => true }) }));
jest.mock('@/utils/schemaValidator', () => ({ registerValidationSchema: jest.fn() }));

describe('Combat Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates a combat', () => {
    const store = useCombatStore();
    const combat = {
      encounterId: 'e1',
      partyId: 'p1',
      status: 'preparing',
      currentRound: 0,
      currentTurn: 0,
      combatants: [],
      createdAt: 0,
      updatedAt: 0
    };
    const result = store.addCombat(combat);
    expect(result.id).toBe('test-uuid-combat');
    expect(store.combats.value).toContainEqual(result);
  });

  it('updates a combat', () => {
    const store = useCombatStore();
    const combat = store.addCombat({ encounterId: 'e1', partyId: 'p1', status: 'preparing', currentRound: 0, currentTurn: 0, combatants: [], createdAt: 0, updatedAt: 0 });
    store.updateCombat(combat.id, { encounterId: 'e1', partyId: 'p1', status: 'active', currentRound: 1, currentTurn: 1, combatants: [], createdAt: 0, updatedAt: 0 });
    expect(store.combats.value[0].status).toBe('active');
    expect(store.combats.value[0].currentRound).toBe(1);
  });

  it('deletes a combat', () => {
    const store = useCombatStore();
    const combat = store.addCombat({ encounterId: 'e1', partyId: 'p1', status: 'preparing', currentRound: 0, currentTurn: 0, combatants: [], createdAt: 0, updatedAt: 0 });
    store.deleteCombat(combat.id);
    expect(store.combats.value).not.toContainEqual(combat);
  });

  it('gets combat by id', () => {
    const store = useCombatStore();
    const combat = store.addCombat({ encounterId: 'e1', partyId: 'p1', status: 'preparing', currentRound: 0, currentTurn: 0, combatants: [], createdAt: 0, updatedAt: 0 });
    expect(store.getCombatById(combat.id)).toEqual(combat);
  });

  it('returns null for non-existent combat', () => {
    const store = useCombatStore();
    expect(store.getCombatById('nope')).toBeNull();
  });

  it('getCombatByEncounter and getCombatByParty work', () => {
    const store = useCombatStore();
    const combat = store.addCombat({ encounterId: 'e1', partyId: 'p1', status: 'preparing', currentRound: 0, currentTurn: 0, combatants: [], createdAt: 0, updatedAt: 0 });
    expect(store.getCombatByEncounter('e1')).toEqual(combat);
    expect(store.getCombatByParty('p1')).toContain(combat);
  });

  it('addCombatant, updateCombatant, removeCombatant work', () => {
    const store = useCombatStore();
    const combat = store.addCombat({ encounterId: 'e1', partyId: 'p1', status: 'preparing', currentRound: 0, currentTurn: 0, combatants: [], createdAt: 0, updatedAt: 0 });
    const combatant = { id: 'cb1', name: 'Alice', type: 'player', initiative: 10, hitPoints: { maximum: 10, current: 10, temporary: 0 }, conditions: [], referenceId: 'char1', notes: '', createdAt: 0, updatedAt: 0 };
    store.addCombatant(combat.id, combatant);
    expect(store.combats.value[0].combatants).toContainEqual(combatant);
    store.updateCombatant(combat.id, 'cb1', { initiative: 15 });
    expect(store.combats.value[0].combatants[0].initiative).toBe(15);
    store.removeCombatant(combat.id, 'cb1');
    expect(store.combats.value[0].combatants).not.toContainEqual(combatant);
  });

  it('turn logic: updateTurn, nextTurn, previousTurn', () => {
    const store = useCombatStore();
    const combatant = { id: 'cb1', name: 'Alice', type: 'player', initiative: 10, hitPoints: { maximum: 10, current: 10, temporary: 0 }, conditions: [], referenceId: 'char1', notes: '', createdAt: 0, updatedAt: 0 };
    const combat = store.addCombat({ encounterId: 'e1', partyId: 'p1', status: 'preparing', currentRound: 1, currentTurn: 0, combatants: [combatant], createdAt: 0, updatedAt: 0 });
    store.updateTurn(combat.id, 2, 1);
    expect(store.getCombatById(combat.id)?.currentRound).toBe(2);
    expect(store.getCombatById(combat.id)?.currentTurn).toBe(1);
    store.nextTurn(combat.id);
    expect(store.getCombatById(combat.id)?.currentTurn).toBe(0);
    expect(store.getCombatById(combat.id)?.currentRound).toBe(3);
    store.previousTurn(combat.id);
    expect(store.getCombatById(combat.id)?.currentTurn).toBe(0);
    expect(store.getCombatById(combat.id)?.currentRound).toBe(3);
  });

  it('endCombat, startCombat, resetCombat work', () => {
    const store = useCombatStore();
    const combatant = { id: 'cb1', name: 'Alice', type: 'player', initiative: 10, hitPoints: { maximum: 10, current: 10, temporary: 0 }, conditions: ['stunned'], referenceId: 'char1', notes: '', createdAt: 0, updatedAt: 0 };
    const combat = store.addCombat({ encounterId: 'e1', partyId: 'p1', status: 'preparing', currentRound: 0, currentTurn: 0, combatants: [combatant], createdAt: 0, updatedAt: 0 });
    store.startCombat(combat.id);
    expect(store.getCombatById(combat.id)?.status).toBe('active');
    store.endCombat(combat.id);
    expect(store.getCombatById(combat.id)?.status).toBe('completed');
    store.resetCombat(combat.id);
    expect(store.getCombatById(combat.id)?.status).toBe('preparing');
    expect(store.getCombatById(combat.id)?.currentRound).toBe(0);
    expect(store.getCombatById(combat.id)?.currentTurn).toBe(0);
    expect(store.getCombatById(combat.id)?.combatants[0].hitPoints.current).toBe(10);
    expect(store.getCombatById(combat.id)?.combatants[0].conditions).toEqual([]);
  });
}); 