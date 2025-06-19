import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Note } from '@/types';
import { generateId, useStorage, isArray, hasRequiredFields } from '@/utils/storage';
import { useModuleStore } from "./modules";
import noteSchema from "@/schemas/note.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';
import { useMentionsStore } from './createIndexationStore';

registerValidationSchema('note', noteSchema);

const isNote = (value: unknown): value is Note => {
  return typeof value === 'object' && value !== null &&
    typeof (value as any).title === 'string' &&
    typeof (value as any).content === 'string' &&
    (typeof (value as any).typeId === 'string' || (value as any).typeId === null) &&
    Array.isArray((value as any).tags) &&
    (typeof (value as any).moduleId === 'string' || (value as any).moduleId === null);
};

export const useNoteStore = defineStore('notes', () => {
  // State
  const items = useStorage<Note[]>({
    key: 'dnd-notes',
    defaultValue: [],
    validate: (data): data is Note[] => 
      isArray(data) && data.every(note => 
        isNote(note) && hasRequiredFields(note as Note, ['id', 'title', 'content', 'typeId', 'tags', 'moduleId', 'createdAt', 'updatedAt'])
      )
  });
  const currentNoteId = ref<string | null>(null);
  const searchQuery = useStorage<string>({
    key: 'dnd-notes-search',
    defaultValue: ''
  });
  const isLoaded = ref(false);

  // Computed
  const currentNote = computed(() => {
    if (!currentNoteId.value) return null;
    return items.value.find(n => n.id === currentNoteId.value) || null;
  });
  const filteredNotes = computed(() => {
    const moduleStore = useModuleStore();
    let result = items.value;
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
    items.value.forEach(note =>
      note.tags.forEach(tag => tags.add(tag))
    );
    return Array.from(tags);
  });

  // CRUD
  const createNote = (note: Omit<Note, 'id'>) => {
    const newNote: Note = {
      ...note,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    items.value.push(newNote);
    const indexation = useMentionsStore();
    const from = { kind: 'note', id: newNote.id };
    const mentioned = extractMentionedEntities(newNote.content);
    indexation.setLinks(from, mentioned);
    return newNote;
  };
  const updateNote = (id: string, note: Omit<Note, 'id'>) => {
    const noteFound = getNoteById(id);
    if (noteFound) {
      const index = items.value.indexOf(noteFound);
      items.value[index] = {
        ...note,
        id,
        updatedAt: Date.now()
      };
      const indexation = useMentionsStore();
      const from = { kind: 'note', id };
      const mentioned = extractMentionedEntities(note.content);
      indexation.setLinks(from, mentioned);
    }
  };
  const deleteNote = (id: string) => {
    items.value = items.value.filter(note => note.id !== id);
    if (currentNoteId.value === id) currentNoteId.value = null;
    const indexation = useMentionsStore();
    const from = { kind: 'note', id };
    indexation.clearLinks(from);
  };
  const getNoteById = (id: string) => items.value.find(n => n.id === id) || null;
  const loadNotes = async () => {
    isLoaded.value = false;
    // (simulate async load, but use items.value for now)
    isLoaded.value = true;
    return items.value;
  };

  // Legacy aliases
  const notes = items;

  return {
    items,
    currentNoteId,
    currentNote,
    searchQuery,
    filteredNotes,
    allTags,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    loadNotes,
    isLoaded,
    // Legacy aliases
    notes,
  };
});
