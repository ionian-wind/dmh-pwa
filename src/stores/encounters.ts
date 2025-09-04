import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Encounter } from '@/types';
import { useStore } from '@/utils/storage';
import encounterSchema from '@/schemas/encounter.schema.json';

export const useEncounterStore = defineStore('encounters', () => {
  const base = useStore<Encounter>({
    storeName: 'encounters',
    validationSchema: encounterSchema,
  });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((encounter) =>
        encounter.name.toLowerCase().includes(query),
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
