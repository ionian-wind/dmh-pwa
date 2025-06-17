import { defineStore } from 'pinia';
import { computed } from 'vue';
import { NoteType } from '@/types';
import { generateId, useStorage, isArray, hasRequiredFields } from '@/utils/storage';
import {registerValidationSchema} from "@/utils/schemaValidator";
import noteTypeSchema from "@/schemas/noteType.schema.json";

registerValidationSchema('noteType', noteTypeSchema);

const isNoteType = (value: unknown): value is NoteType => {
  return typeof value === 'object' && value !== null &&
    typeof (value as any).name === 'string';
};

export const useNoteTypeStore = defineStore('noteTypes', () => {
  const noteTypes = useStorage<NoteType[]>({
    key: 'dnd-note-types',
    defaultValue: [],
    validate: (data): data is NoteType[] => 
      isArray(data) && data.every(type => 
        isNoteType(type) && hasRequiredFields(type as NoteType, ['id', 'name', 'createdAt', 'updatedAt'])
      )
  });

  const currentTypeId = useStorage<string | null>({
    key: 'dnd-current-note-type',
    defaultValue: null
  });

  const currentType = computed(() => {
    if (!currentTypeId.value) return null;
    return noteTypes.value.find(t => t.id === currentTypeId.value) || null;
  });

  const addNoteType = (type: Omit<NoteType, 'id'>) => {
    const newType: NoteType = {
      ...type,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    noteTypes.value.push(newType);
    return newType;
  };

  const updateNoteType = (id: string, type: Omit<NoteType, 'id'>) => {
    const index = noteTypes.value.findIndex(t => t.id === id);
    if (index !== -1) {
      noteTypes.value[index] = {
        ...type,
        id,
        createdAt: noteTypes.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };

  const deleteNoteType = (id: string) => {
    noteTypes.value = noteTypes.value.filter(t => t.id !== id);
    if (currentTypeId.value === id) {
      currentTypeId.value = null;
    }
  };

  const setCurrentType = (id: string | null) => {
    currentTypeId.value = id;
  };

  const getNoteType = (id: string) => {
    return noteTypes.value.find(t => t.id === id) || null;
  };

  // For compatibility with existing code
  const loadNoteTypes = async () => {
    // Data is already loaded by useStorage
    return noteTypes.value;
  };

  return {
    noteTypes,
    currentTypeId,
    currentType,
    addNoteType,
    updateNoteType,
    deleteNoteType,
    setCurrentType,
    getNoteType,
    loadNoteTypes
  };
}); 
