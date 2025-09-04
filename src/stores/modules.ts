import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Module } from '@/types';
import { useStore } from '@/utils/storage';
import moduleSchema from '@/schemas/module.schema.json';

export const useModuleStore = defineStore('modules', () => {
  const base = useStore<Module>({
    storeName: 'modules',
    validationSchema: moduleSchema,
  });

  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((module) =>
        module.name.toLowerCase().includes(query),
      );
    }
    return result;
  });

  const sortedItems = base.sortedItems;

  const getModuleName = (id: string | null) => {
    if (!id) return 'No Module';
    const module = base.items.value.find((m) => m.id === id);
    return module?.name || 'Unknown Module';
  };

  return {
    ...base,
    filtered,
    sortedItems,
    getModuleName,
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
