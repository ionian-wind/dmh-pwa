import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { NoteType } from '@/types';
import { isArray, hasRequiredFields } from '@/utils/storage';
import { registerValidationSchema } from "@/utils/schemaValidator";
import noteTypeSchema from "@/schemas/noteType.schema.json";
import { createBaseStore, type StandardizedStore } from './createBaseStore';

registerValidationSchema('noteType', noteTypeSchema);

const isNoteType = (value: unknown): value is NoteType => {
  return typeof value === 'object' && value !== null &&
    typeof (value as any).name === 'string';
};

const baseStore = createBaseStore<NoteType>({
  storageKey: 'dnd-note-types',
  validate: (data): data is NoteType[] => 
    isArray(data) && data.every(type => 
      isNoteType(type) && hasRequiredFields(type as NoteType, ['id', 'name', 'createdAt', 'updatedAt'])
    ),
  schema: 'noteType'
});

export const useNoteTypeStore = defineStore('noteTypes', (): StandardizedStore<NoteType> => {
  const base = baseStore();
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');

  // Computed
  const current = computed(() => {
    if (!currentId.value) return null;
    return base.getById(currentId.value) || null;
  });

  const filtered = computed(() => {
    if (searchQuery.value === '') return base.items.value;
    return base.items.value.filter(item =>
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });

  // Extended CRUD operations with standardized names
  const create = async (type: Omit<NoteType, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newType = await base.create(type);
    return newType;
  };

  const update = async (id: string, type: Partial<Omit<NoteType, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updatedType = await base.update(id, type);
    return updatedType;
  };

  const remove = async (id: string) => {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  };

  const load = async () => {
    return base.load();
  };

  // Helpers
  const setCurrentType = (id: string | null) => {
    currentId.value = id;
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

    // Additional computed properties
    searchQuery,
  };
}); 
