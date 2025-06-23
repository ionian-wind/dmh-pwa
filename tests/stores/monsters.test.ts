import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMonsterStore } from '@/stores/monsters';

// Mock dependencies
vi.mock('@/utils/storage', () => ({
  useStorage: vi.fn(() => ({ value: [] })),
  generateId: vi.fn(() => 'test-uuid-monster'),
  isArray: Array.isArray,
  hasRequiredFields: () => true
}));
vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ matchesModuleFilter: () => true })
}));
vi.mock('@/utils/schemaValidator', () => ({
  registerValidationSchema: vi.fn()
}));

describe('Monster Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const baseMonster = {
    name: 'Goblin',
    type: 'Humanoid',
    size: 'Small',
    alignment: 'CE',
    armorClass: 13,
    hitPoints: 7,
    speed: { walk: 30 },
    abilities: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 },
    senses: [],
    languages: [],
    challengeRating: 1,
    xp: 50,
    actions: [],
    moduleId: 'mod-1',
    createdAt: 0,
    updatedAt: 0
  };

  it('creates a monster', () => {
    const store = useMonsterStore();
    const result = store.createMonster(baseMonster);
    expect(result.id).toBe('test-uuid-monster');
    expect(store.items.value).toContainEqual(result);
  });

  it('updates a monster', () => {
    const store = useMonsterStore();
    const monster = store.createMonster(baseMonster);
    store.updateMonster(monster.id, { ...baseMonster, name: 'Orc' });
    expect(store.items.value[0].name).toBe('Orc');
  });

  it('deletes a monster', () => {
    const store = useMonsterStore();
    const monster = store.createMonster(baseMonster);
    store.deleteMonster(monster.id);
    expect(store.items.value).not.toContainEqual(monster);
  });

  it('gets monster by id', () => {
    const store = useMonsterStore();
    const monster = store.createMonster(baseMonster);
    expect(store.getMonsterById(monster.id)).toEqual(monster);
  });

  it('returns null for non-existent monster', () => {
    const store = useMonsterStore();
    expect(store.getMonsterById('nope')).toBeNull();
  });

  it('filteredMonsters returns all if filter always true', () => {
    const store = useMonsterStore();
    store.createMonster(baseMonster);
    expect(store.filteredMonsters.value.length).toBe(store.items.value.length);
  });
}); 