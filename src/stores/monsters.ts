import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Monster } from '@/types';
import { useStore } from '@/utils/storage';
import monsterSchema from '@/schemas/monster.schema.json';

export const useMonsterStore = defineStore('monsters', () => {
  const base = useStore<Monster>({
    storeName: 'monsters',
    validationSchema: monsterSchema,
  });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((monster) =>
        monster.name.toLowerCase().includes(query),
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
