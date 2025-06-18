import { setActivePinia, createPinia } from 'pinia';
import { useEncounterStore } from '@/stores/encounters';
jest.mock('@/utils/storage', () => ({
  useStorage: jest.fn(() => ({ value: [] })),
  generateId: jest.fn(() => 'test-uuid-enc')
}));
jest.mock('@/stores/modules', () => ({ useModuleStore: () => ({ matchesModuleFilter: () => true }) }));
jest.mock('@/utils/schemaValidator', () => ({ registerValidationSchema: jest.fn() }));
jest.mock('@/utils/storage', () => ({
  ...jest.requireActual('@/utils/storage'),
  useStorage: jest.fn(() => ({ value: [] })),
  generateId: jest.fn(() => 'test-uuid-enc')
}));

describe('Encounter Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates an encounter', () => {
    const store = useEncounterStore();
    const enc = {
      name: 'Test', difficulty: 'Easy', monsters: {}, level: 1, xp: 0, moduleId: 'mod-1', currentRound: 1, currentTurn: 0, description: '', createdAt: 0, updatedAt: 0
    };
    const result = store.addEncounter(enc);
    expect(result.id).toBe('test-uuid-enc');
    expect(store.encounters.value).toContainEqual(result);
  });

  it('updates an encounter', () => {
    const store = useEncounterStore();
    const enc = store.addEncounter({ name: 'Old', difficulty: 'Easy', monsters: {}, level: 1, xp: 0, moduleId: 'mod-1', currentRound: 1, currentTurn: 0, description: '', createdAt: 0, updatedAt: 0 });
    store.updateEncounter(enc.id, { name: 'New', difficulty: 'Hard', monsters: {}, level: 2, xp: 100, moduleId: 'mod-1', currentRound: 2, currentTurn: 1, description: 'desc' });
    expect(store.encounters.value[0].name).toBe('New');
    expect(store.encounters.value[0].difficulty).toBe('Hard');
  });

  it('deletes an encounter', () => {
    const store = useEncounterStore();
    const enc = store.addEncounter({ name: 'Delete', difficulty: 'Easy', monsters: {}, level: 1, xp: 0, moduleId: 'mod-1', currentRound: 1, currentTurn: 0, description: '', createdAt: 0, updatedAt: 0 });
    store.deleteEncounter(enc.id);
    expect(store.encounters.value).not.toContainEqual(enc);
  });

  it('gets encounter by id', () => {
    const store = useEncounterStore();
    const enc = store.addEncounter({ name: 'Find', difficulty: 'Easy', monsters: {}, level: 1, xp: 0, moduleId: 'mod-1', currentRound: 1, currentTurn: 0, description: '', createdAt: 0, updatedAt: 0 });
    expect(store.getEncounterById(enc.id)).toEqual(enc);
  });

  it('returns null for non-existent encounter', () => {
    const store = useEncounterStore();
    expect(store.getEncounterById('nope')).toBeNull();
  });

  it('filteredEncounters returns all if filter always true', () => {
    const store = useEncounterStore();
    store.addEncounter({ name: 'A', difficulty: 'Easy', monsters: {}, level: 1, xp: 0, moduleId: 'mod-1', currentRound: 1, currentTurn: 0, description: '', createdAt: 0, updatedAt: 0 });
    expect(store.filteredEncounters.value.length).toBe(store.encounters.value.length);
  });

  it('addMonster, removeMonster, setMonsterCount, getMonsterCount work', () => {
    const store = useEncounterStore();
    const enc = store.addEncounter({ name: 'Mon', difficulty: 'Easy', monsters: {}, level: 1, xp: 0, moduleId: 'mod-1', currentRound: 1, currentTurn: 0, description: '', createdAt: 0, updatedAt: 0 });
    store.addMonster(enc.id, 'm1', 2);
    expect(store.getMonsterCount(enc.id, 'm1')).toBe(2);
    store.setMonsterCount(enc.id, 'm1', 5);
    expect(store.getMonsterCount(enc.id, 'm1')).toBe(5);
    store.removeMonster(enc.id, 'm1');
    expect(store.getMonsterCount(enc.id, 'm1')).toBe(0);
  });

  it('setMonsterCount caps at 20 and removes at 0', () => {
    const store = useEncounterStore();
    const enc = store.addEncounter({ name: 'Cap', difficulty: 'Easy', monsters: {}, level: 1, xp: 0, moduleId: 'mod-1', currentRound: 1, currentTurn: 0, description: '', createdAt: 0, updatedAt: 0 });
    store.setMonsterCount(enc.id, 'm1', 25);
    expect(store.getMonsterCount(enc.id, 'm1')).toBe(20);
    store.setMonsterCount(enc.id, 'm1', 0);
    expect(store.getMonsterCount(enc.id, 'm1')).toBe(0);
  });

  it('turn logic: updateTurn, nextTurn, previousTurn', () => {
    const store = useEncounterStore();
    const enc = store.addEncounter({ name: 'Turn', difficulty: 'Easy', monsters: { m1: 1, m2: 1 }, level: 1, xp: 0, moduleId: 'mod-1', currentRound: 1, currentTurn: 0, description: '', createdAt: 0, updatedAt: 0 });
    store.updateTurn(enc.id, 2, 1);
    expect(store.getEncounterById(enc.id)?.currentRound).toBe(2);
    expect(store.getEncounterById(enc.id)?.currentTurn).toBe(1);
    store.nextTurn(enc.id);
    expect(store.getEncounterById(enc.id)?.currentTurn).toBe(0);
    expect(store.getEncounterById(enc.id)?.currentRound).toBe(3);
    store.previousTurn(enc.id);
    expect(store.getEncounterById(enc.id)?.currentTurn).toBe(1);
    expect(store.getEncounterById(enc.id)?.currentRound).toBe(2);
  });
}); 