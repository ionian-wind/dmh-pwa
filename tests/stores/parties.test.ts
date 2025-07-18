import { setActivePinia, createPinia } from 'pinia';
import { usePartyStore } from '@/stores/parties';
import { vi } from 'vitest';
vi.mock('@/utils/storage', () => ({
  useStorage: vi.fn(() => ({ value: [] })),
  generateId: vi.fn(() => 'test-uuid-555')
}));
vi.mock('@/stores/modules', () => ({ useModuleStore: () => ({ matchesModuleFilterMultiple: () => true }) }));
vi.mock('@/utils/schemaValidator', () => ({ registerValidationSchema: vi.fn() }));

describe('Party Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates a party', () => {
    const store = usePartyStore();
    const party = {
      name: 'Heroes',
      description: 'A party of heroes',
      characters: [],
      moduleIds: [],
      createdAt: 0,
      updatedAt: 0
    };
    const result = store.createParty(party);
    expect(result.id).toBe('test-uuid-555');
    expect(store.items.value).toContainEqual(result);
  });

  it('updates a party', () => {
    const store = usePartyStore();
    const party = store.createParty({
      name: 'Old', description: '', characters: [], moduleIds: [], createdAt: 0, updatedAt: 0 });
    store.updateParty(party.id, { name: 'New', description: 'Desc', characters: [], moduleIds: [] });
    expect(store.items.value[0].name).toBe('New');
    expect(store.items.value[0].description).toBe('Desc');
  });

  it('deletes a party', () => {
    const store = usePartyStore();
    const party = store.createParty({ name: 'Delete', description: '', characters: [], moduleIds: [], createdAt: 0, updatedAt: 0 });
    store.deleteParty(party.id);
    expect(store.items.value).not.toContainEqual(party);
  });

  it('gets a party by id', () => {
    const store = usePartyStore();
    const party = store.createParty({ name: 'Find', description: '', characters: [], moduleIds: [], createdAt: 0, updatedAt: 0 });
    const found = store.getPartyById(party.id);
    expect(found).toEqual(party);
  });

  it('returns null for non-existent party', () => {
    const store = usePartyStore();
    expect(store.getPartyById('non-existent')).toBeNull();
  });

  it('filteredParties returns all if filter always true', () => {
    const store = usePartyStore();
    store.createParty({ name: 'A', description: '', characters: [], moduleIds: [], createdAt: 0, updatedAt: 0 });
    expect(store.filteredParties.value.length).toBe(store.items.value.length);
  });

  it('addCharacterToParty and removeCharacterFromParty work', () => {
    const store = usePartyStore();
    const party = store.createParty({ name: 'P', description: '', characters: [], moduleIds: [], createdAt: 0, updatedAt: 0 });
    store.addCharacterToParty(party.id, 'char-1');
    expect(store.getPartyById(party.id)?.characters).toContain('char-1');
    store.removeCharacterFromParty(party.id, 'char-1');
    expect(store.getPartyById(party.id)?.characters).not.toContain('char-1');
  });
}); 