import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Note } from '@/types';
import { isArray, hasRequiredFields, migrateStorageData, migrateNoteData } from '@/utils/storage';
import { useModuleStore } from "./modules";
import noteSchema from "@/schemas/note.schema.json";
import { registerValidationSchema } from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';
import { useMentionsStore } from './createIndexationStore';
import { createBaseStore, type StandardizedStore } from './createBaseStore';

registerValidationSchema('note', noteSchema);

const isNote = (value: unknown): value is Note => {
  return typeof value === 'object' && value !== null &&
    typeof (value as any).title === 'string' &&
    typeof (value as any).content === 'string' &&
    (typeof (value as any).typeId === 'string' || (value as any).typeId === null) &&
    Array.isArray((value as any).tags) &&
    (typeof (value as any).moduleId === 'string' || (value as any).moduleId === null);
};

const baseStore = createBaseStore<Note>({
  storageKey: 'dnd-notes',
  validate: (data): data is Note[] => 
    isArray(data) && data.every(note => 
      isNote(note) && hasRequiredFields(note, ['id', 'title', 'content', 'typeId', 'tags', 'moduleId', 'createdAt', 'updatedAt'])
    ),
  schema: 'note'
});

export const useNoteStore = defineStore('notes', (): StandardizedStore<Note> => {
  const base = baseStore();
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');

  // Computed
  const current = computed(() => {
    if (!currentId.value) return null;
    return base.getById(currentId.value) || null;
  });

  const filtered = computed(() => {
    const moduleStore = useModuleStore();
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    result = result.filter(note => moduleStore.matchesModuleFilter(note.moduleId));
    return result;
  });

  const allTags = computed(() => {
    const tags = new Set<string>();
    base.items.value.forEach(note =>
      note.tags.forEach(tag => tags.add(tag))
    );
    return Array.from(tags);
  });

  // Extended CRUD operations with standardized names
  const create = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote = await base.create(note);
    const indexation = useMentionsStore();
    const from = { kind: 'note', id: newNote.id };
    const mentioned = extractMentionedEntities(newNote.content);
    indexation.setLinks(from, mentioned);
    return newNote;
  };

  const update = async (id: string, note: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updatedNote = await base.update(id, note);
    const indexation = useMentionsStore();
    const from = { kind: 'note', id };
    const mentioned = extractMentionedEntities(note.content || '');
    indexation.setLinks(from, mentioned);
    return updatedNote;
  };

  const remove = async (id: string) => {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
    const indexation = useMentionsStore();
    const from = { kind: 'note', id };
    indexation.clearLinks(from);
  };

  const load = async () => {
    // Run migration first if data exists but validation fails
    try {
      const migratedData = await migrateStorageData('dnd-notes', migrateNoteData, []);
      if (migratedData.length > 0 && base.items.value.length === 0) {
        // Only update if we have migrated data and no current data
        base.items.value = migratedData;
        console.log(`[Notes] Migrated ${migratedData.length} notes`);
      }
    } catch (e) {
      console.warn('[Notes] Migration failed:', e);
    }
    
    // Then load normally
    return base.load();
  };

  return {
    // State
    items: base.items,
    filtered,
    sortedItems: base.sortedItems,
    currentId,
    current,
    isLoading: base.isLoading,
    error: base.error,
    isLoaded: base.isLoaded,

    // Actions
    load,
    create,
    update,
    remove,
    getById: base.getById,
    setCurrentId: (id: string | null) => { currentId.value = id; },
    clearCurrent: () => { currentId.value = null; },
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },
    setSearchQuery: (query: string) => { searchQuery.value = query; },

    // Additional computed properties
    allTags,
    searchQuery,
  };
});
