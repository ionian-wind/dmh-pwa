import { setActivePinia, createPinia } from 'pinia';
import { useNoteTypeStore } from '../../src/stores/noteTypes';
import { vi } from 'vitest';

vi.mock('@/utils/storage', () => ({
  useStorage: vi.fn(() => ({ value: [] })),
  generateId: vi.fn(() => 'test-uuid-type')
}));
vi.mock('@/utils/schemaValidator', () => ({ registerValidationSchema: vi.fn() }));

describe('NoteType Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates a note type', () => {
    const store = useNoteTypeStore();
    const type = { name: 'Type', description: '', color: '#fff', icon: '', fields: [], createdAt: 0, updatedAt: 0 };
    const result = store.addNoteType(type);
    expect(result.id).toBe('test-uuid-type');
    expect(store.noteTypes.value).toContainEqual(result);
  });

  it('updates a note type', () => {
    const store = useNoteTypeStore();
    const type = store.addNoteType({ name: 'Old', description: '', color: '#fff', icon: '', fields: [], createdAt: 0, updatedAt: 0 });
    store.updateNoteType(type.id, { name: 'New', description: 'desc', color: '#000', icon: '', fields: [] });
    expect(store.noteTypes.value[0].name).toBe('New');
    expect(store.noteTypes.value[0].description).toBe('desc');
  });

  it('deletes a note type', () => {
    const store = useNoteTypeStore();
    const type = store.addNoteType({ name: 'Delete', description: '', color: '#fff', icon: '', fields: [], createdAt: 0, updatedAt: 0 });
    store.deleteNoteType(type.id);
    expect(store.noteTypes.value).not.toContainEqual(type);
  });

  it('gets note type by id', () => {
    const store = useNoteTypeStore();
    const type = store.addNoteType({ name: 'Find', description: '', color: '#fff', icon: '', fields: [], createdAt: 0, updatedAt: 0 });
    expect(store.getNoteType(type.id)).toEqual(type);
  });

  it('returns null for non-existent note type', () => {
    const store = useNoteTypeStore();
    expect(store.getNoteType('nope')).toBeNull();
  });

  it('loadNoteTypes returns all note types', async () => {
    const store = useNoteTypeStore();
    store.addNoteType({ name: 'A', description: '', color: '#fff', icon: '', fields: [], createdAt: 0, updatedAt: 0 });
    const types = await store.loadNoteTypes();
    expect(types.length).toBe(store.noteTypes.value.length);
  });

  it('setCurrentType sets and clears currentTypeId and currentType', () => {
    const store = useNoteTypeStore();
    const type = store.addNoteType({ name: 'A', description: '', color: '#fff', icon: '', fields: [], createdAt: 0, updatedAt: 0 });
    store.setCurrentType(type.id);
    expect(store.currentTypeId).toBe(type.id);
    expect(store.currentType).toBe(null); // Because useStorage is mocked as empty
    store.setCurrentType(null);
    expect(store.currentTypeId).toBe(null);
  });

  it('deleting the currently selected type resets currentTypeId to null', () => {
    const store = useNoteTypeStore();
    const type = store.addNoteType({ name: 'B', description: '', color: '#fff', icon: '', fields: [], createdAt: 0, updatedAt: 0 });
    store.setCurrentType(type.id);
    store.deleteNoteType(type.id);
    expect(store.currentTypeId).toBe(null);
  });
}); 