import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
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
  // State
  const items = useStorage<NoteType[]>({
    key: 'dnd-note-types',
    defaultValue: [],
    validate: (data): data is NoteType[] => 
      isArray(data) && data.every(type => 
        isNoteType(type) && hasRequiredFields(type as NoteType, ['id', 'name', 'createdAt', 'updatedAt'])
      )
  });
  const currentTypeId = ref<string | null>(null);

  // Computed
  const currentType = computed(() => {
    if (!currentTypeId.value) return null;
    return items.value.find(t => t.id === currentTypeId.value) || null;
  });

  // CRUD
  const createNoteType = (type: Omit<NoteType, 'id'>) => {
    const newType: NoteType = {
      ...type,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    items.value.push(newType);
    return newType;
  };
  const updateNoteType = (id: string, type: Omit<NoteType, 'id'>) => {
    const index = items.value.findIndex(t => t.id === id);
    if (index !== -1) {
      items.value[index] = {
        ...type,
        id,
        createdAt: items.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };
  const deleteNoteType = (id: string) => {
    items.value = items.value.filter(t => t.id !== id);
    if (currentTypeId.value === id) currentTypeId.value = null;
  };
  const getNoteTypeById = (id: string) => items.value.find(t => t.id === id) || null;
  const loadNoteTypes = async () => items.value;

  // Helpers
  const setCurrentType = (id: string | null) => {
    currentTypeId.value = id;
  };

  // Legacy aliases
  const noteTypes = items;

  return {
    items,
    currentTypeId,
    currentType,
    createNoteType,
    updateNoteType,
    deleteNoteType,
    getNoteTypeById,
    loadNoteTypes,
    setCurrentType,
    // Legacy aliases
    noteTypes,
  };
}); 
