import { defineStore } from 'pinia';
import { computed } from 'vue';
import { Note } from '@/types';
import { generateId, useStorage, isArray, hasRequiredFields } from '@/utils/storage';
import { useModuleStore } from "./modules";
import noteSchema from "@/schemas/note.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";

const isNote = (value: unknown): value is Note => {
  return typeof value === 'object' && value !== null &&
    typeof (value as any).title === 'string' &&
    typeof (value as any).content === 'string' &&
    typeof (value as any).typeId === 'string' &&
    Array.isArray((value as any).tags) &&
    typeof (value as any).moduleId === 'string';
};

registerValidationSchema('note', noteSchema);

export const useNoteStore = defineStore('notes', () => {
  const notes = useStorage<Note[]>({
    key: 'dnd-notes',
    defaultValue: [],
    validate: (data): data is Note[] => 
      isArray(data) && data.every(note => 
        isNote(note) && hasRequiredFields(note as Note, ['id', 'title', 'content', 'typeId', 'tags', 'moduleId', 'createdAt', 'updatedAt'])
      )
  });

  const searchQuery = useStorage<string>({
    key: 'dnd-notes-search',
    defaultValue: ''
  });

  const loadNotes = async () => {
    // Notes are automatically loaded by useStorage
    return notes.value;
  };

  const createNote = (note: Omit<Note, 'id'>) => {
    const newNote: Note = {
      ...note,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    notes.value.push(newNote);
    return newNote;
  };

  const updateNote = (id: string, note: Omit<Note, 'id'>) => {
    const noteFound = getNoteById(id);
    
    if (noteFound) {
      const index = notes.value.indexOf(noteFound);
      
      notes.value[index] = {
        ...note,
        id,
        updatedAt: Date.now()
      };
    }
  };

  const deleteNote = (id: string) => {
    notes.value = notes.value.filter(note => note.id !== id);
  };

  const filteredNotes = computed(() => {
    if (!searchQuery.value) return notes.value;
    const moduleStore = useModuleStore();
    
    const query = searchQuery.value.toLowerCase();
    
    let result = notes.value.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );

    // Filter by current module
    if (moduleStore.currentModuleId) {
      result = result.filter(note => note.moduleId === moduleStore.currentModuleId);
    }
    
    return result;
  });

  const allTags = computed(() => {
    const tags = new Set<string>();
    notes.value.forEach(note =>
      note.tags.forEach(tag => tags.add(tag))
    );
    return Array.from(tags);
  });

  const getNoteById = (id: string) => {
    return notes.value.find(n => n.id === id) || null;
  };

  return {
    notes,
    searchQuery,
    filteredNotes,
    allTags,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    loadNotes
  };
});
