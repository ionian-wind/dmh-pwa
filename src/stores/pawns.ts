import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Pawn } from '@/types';
import { useStore } from '@/utils/storage';
import pawnSchema from '@/schemas/pawn.schema.json';

export const usePawnStore = defineStore('pawns', () => {
  const base = useStore<Pawn>({
    storeName: 'pawns',
    validationSchema: pawnSchema,
  });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((pawn) => pawn.name.toLowerCase().includes(query));
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
