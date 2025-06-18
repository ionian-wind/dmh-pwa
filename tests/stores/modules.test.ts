import { setActivePinia, createPinia } from 'pinia';
import { useModuleStore } from '../../src/stores/modules';
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

  it('setCurrentModule sets filter by id and resets to any when null', () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'A', description: '', createdAt: 0, updatedAt: 0 });
    store.setCurrentModule(mod.id);
    expect(store.currentModuleFilter).toBe(mod.id);
    expect(store.currentModule).toBe(null); // Because useStorage is mocked as empty
    store.setCurrentModule(null);
    expect(store.currentModuleFilter).toBe('any');
  });

  it('loadModules returns items', async () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'B', description: '', createdAt: 0, updatedAt: 0 });
    const modules = await store.loadModules();
    expect(modules).toContainEqual(mod);
  });

  it('deleting the currently selected module resets filter to any and persists', () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'C', description: '', createdAt: 0, updatedAt: 0 });
    store.setCurrentModuleFilter(mod.id);
    // Spy on localStorage.setItem
    const setItemSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
    store.deleteModule(mod.id);
    expect(store.currentModuleFilter).toBe('any');
    expect(setItemSpy).toHaveBeenCalledWith('dnd-current-module-filter', 'any');
    setItemSpy.mockRestore();
  });

  it('persists and restores module filter from localStorage', () => {
    localStorage.setItem('dnd-current-module-filter', 'persisted-id');
    const store = useModuleStore();
    expect(store.currentModuleFilter).toBe('persisted-id');
    store.setCurrentModuleFilter('new-id');
    expect(localStorage.getItem('dnd-current-module-filter')).toBe('new-id');
  });
}); 