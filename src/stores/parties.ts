import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Party } from '@/types';
import { useStore } from '@/utils/storage';
import partySchema from '@/schemas/party.schema.json';

export const usePartyStore = defineStore('parties', () => {
  const base = useStore<Party>({
    storeName: 'parties',
    validationSchema: partySchema,
  });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((party) =>
        party.name.toLowerCase().includes(query),
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
