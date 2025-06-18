import { setActivePinia, createPinia } from 'pinia';
import { useModuleStore } from '@/stores/modules';
jest.mock('@/utils/storage', () => ({
  useStorage: jest.fn(() => ({ value: [] })),
  generateId: jest.fn(() => 'test-uuid-123')
}));
jest.mock('@/utils/schemaValidator', () => ({ registerValidationSchema: jest.fn() }));

describe('Module Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('creates a module', () => {
    const store = useModuleStore();
    const mod = { name: 'Mod', description: 'desc', createdAt: 0, updatedAt: 0 };
    const result = store.addModule(mod);
    expect(result.id).toBe('test-uuid-123');
    expect(store.modules.value).toContainEqual(result);
  });

  it('updates a module', () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'Old', description: '', createdAt: 0, updatedAt: 0 });
    store.updateModule(mod.id, { name: 'New', description: 'desc', createdAt: 0, updatedAt: 0 });
    expect(store.modules.value[0].name).toBe('New');
    expect(store.modules.value[0].description).toBe('desc');
  });

  it('deletes a module', () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'Delete', description: '', createdAt: 0, updatedAt: 0 });
    store.deleteModule(mod.id);
    expect(store.modules.value).not.toContainEqual(mod);
  });

  it('gets module by id', () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'Find', description: '', createdAt: 0, updatedAt: 0 });
    expect(store.getModuleById(mod.id)).toEqual(mod);
  });

  it('returns null for non-existent module', () => {
    const store = useModuleStore();
    expect(store.getModuleById('nope')).toBeNull();
  });

  it('getModuleName returns name or fallback', () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'X', description: '', createdAt: 0, updatedAt: 0 });
    expect(store.getModuleName(mod.id)).toBe('X');
    expect(store.getModuleName('nope')).toBe('Unknown Module');
  });

  it('matchesModuleFilter and matchesModuleFilterMultiple logic', () => {
    const store = useModuleStore();
    store.setCurrentModuleFilter('any');
    expect(store.matchesModuleFilter('foo')).toBe(true);
    expect(store.matchesModuleFilterMultiple(['foo'])).toBe(true);
    store.setCurrentModuleFilter('none');
    expect(store.matchesModuleFilter(null)).toBe(true);
    expect(store.matchesModuleFilterMultiple([])).toBe(true);
    store.setCurrentModuleFilter('bar');
    expect(store.matchesModuleFilter('bar')).toBe(true);
    expect(store.matchesModuleFilter('baz')).toBe(false);
    expect(store.matchesModuleFilterMultiple(['bar'])).toBe(true);
    expect(store.matchesModuleFilterMultiple(['baz'])).toBe(false);
  });
}); 