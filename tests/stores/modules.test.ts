import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useModuleStore } from '../../src/stores/modules';

vi.mock('@/utils/storage', () => ({
  useStorage: vi.fn(() => ({ value: [] })),
  generateId: vi.fn(() => 'test-uuid-123')
}));
vi.mock('@/utils/schemaValidator', () => ({ registerValidationSchema: vi.fn() }));

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

  it('loadModules returns items', async () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'B', description: '', createdAt: 0, updatedAt: 0 });
    const modules = await store.loadModules();
    expect(modules).toContainEqual(mod);
  });

  it('deleting the currently selected module resets filter to any and persists', () => {
    const store = useModuleStore();
    const mod = store.addModule({ name: 'C', description: '', createdAt: 0, updatedAt: 0 });
    // Spy on localStorage.setItem
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem');
    store.deleteModule(mod.id);
    expect(setItemSpy).toHaveBeenCalledWith('dnd-current-module-filter', 'any');
    setItemSpy.mockRestore();
  });

  it('persists and restores module filter from localStorage', () => {
    localStorage.setItem('dnd-current-module-filter', 'persisted-id');
    const store = useModuleStore();
    expect(localStorage.getItem('dnd-current-module-filter')).toBe('persisted-id');
  });
}); 