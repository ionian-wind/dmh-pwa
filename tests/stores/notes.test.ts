import { setActivePinia, createPinia } from 'pinia';
import { useNoteStore } from '@/stores/notes';
jest.mock('@/utils/storage', () => ({
  useStorage: jest.fn(() => ({ value: [] })),
  generateId: jest.fn(() => 'test-uuid-999'),
  isArray: Array.isArray,
  hasRequiredFields: () => true
}));
jest.mock('@/stores/modules', () => ({ useModuleStore: () => ({ matchesModuleFilter: () => true }) }));
jest.mock('@/utils/schemaValidator', () => ({ registerValidationSchema: jest.fn() }));

describe('Note Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('creates a note', () => {
    const store = useNoteStore();
    const note = {
      title: 'Test Note',
      content: 'Content',
      typeId: 'type-1',
      tags: ['tag1'],
      moduleId: 'mod-1',
      createdAt: 0,
      updatedAt: 0
    };
    const result = store.createNote(note);
    expect(result.id).toBe('test-uuid-999');
    expect(store.items.value).toContainEqual(result);
  });

  it('updates a note', () => {
    const store = useNoteStore();
    const note = store.createNote({
      title: 'Old',
      content: 'Old content',
      typeId: 'type-1',
      tags: ['tag1'],
      moduleId: 'mod-1',
      createdAt: 0,
      updatedAt: 0
    });
    store.updateNote(note.id, { ...note, title: 'New', content: 'New content' });
    expect(store.items.value[0].title).toBe('New');
    expect(store.items.value[0].content).toBe('New content');
  });

  it('deletes a note', () => {
    const store = useNoteStore();
    const note = store.createNote({
      title: 'Delete Me',
      content: 'Content',
      typeId: 'type-1',
      tags: ['tag1'],
      moduleId: 'mod-1',
      createdAt: 0,
      updatedAt: 0
    });
    store.deleteNote(note.id);
    expect(store.items.value).not.toContainEqual(note);
  });

  it('gets a note by id', () => {
    const store = useNoteStore();
    const note = store.createNote({
      title: 'Find Me',
      content: 'Content',
      typeId: 'type-1',
      tags: ['tag1'],
      moduleId: 'mod-1',
      createdAt: 0,
      updatedAt: 0
    });
    const found = store.getById(note.id);
    expect(found).toEqual(note);
  });

  it('returns null for non-existent note', () => {
    const store = useNoteStore();
    expect(store.getById('non-existent')).toBeNull();
  });

  it('filtered returns all if filter always true', () => {
    const store = useNoteStore();
    const note1 = { title: 'A', content: 'A', typeId: 't', tags: [], moduleId: 'm', createdAt: 0, updatedAt: 0 };
    const note2 = { title: 'B', content: 'B', typeId: 't', tags: ['x', 'y'], moduleId: 'm', createdAt: 0, updatedAt: 0 };
    store.items.value = [note1, note2];
    expect(store.filtered.value.length).toBe(store.items.value.length);
  });

  it('allTags returns all unique tags', () => {
    const store = useNoteStore();
    store.createNote({ title: 'A', content: 'A', typeId: 't', tags: ['x', 'y'], moduleId: 'm', createdAt: 0, updatedAt: 0 });
    store.createNote({ title: 'B', content: 'B', typeId: 't', tags: ['y', 'z'], moduleId: 'm', createdAt: 0, updatedAt: 0 });
    expect(store.allTags.value.sort()).toEqual(['x', 'y', 'z']);
  });
}); 