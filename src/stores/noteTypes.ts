import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { NoteType } from '@/types';
import { useStore } from '@/utils/storage';
import noteTypeSchema from '@/schemas/noteType.schema.json';

export const useNoteTypeStore = defineStore('noteTypes', () => {
  const base = useStore<NoteType>({
    storeName: 'noteTypes',
    validationSchema: noteTypeSchema,
  });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((noteType) =>
        noteType.name.toLowerCase().includes(query),
      );
    }
    return result;
  });

  const sortedItems = base.sortedItems;

  return {
    ...base,
    filtered,
    sortedItems,
    setFilter: (query: string) => {
      searchQuery.value = query;
    },
    clearFilter: () => {
      searchQuery.value = '';
    },
    setSearchQuery: (query: string) => {
      searchQuery.value = query;
    },
    searchQuery,
  };
});
