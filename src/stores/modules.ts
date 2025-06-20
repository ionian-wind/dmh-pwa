import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Module } from '@/types';
import { useStore } from '@/utils/storage';
import moduleSchema from '@/schemas/module.schema.json';
import { useConfigStore } from '@/utils/configStore';

export const useModuleStore = defineStore('modules', () => {
  const base = useStore<Module>({ storeName: 'modules', validationSchema: moduleSchema });
  const configStore = useConfigStore();

  const currentId = ref<string | null>(null);
  const searchQuery = ref('');

  // Use configStore directly for current module filter
  const currentModuleFilter = computed(() => configStore.currentModuleFilter || 'none');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(module =>
        module.name.toLowerCase().includes(query)
      );
    }
    return result;
  });

  const sortedItems = base.sortedItems;

  const current = computed(() => {
    if (!currentModuleFilter.value || currentModuleFilter.value === 'any' || currentModuleFilter.value === 'none') return null;
    return base.getById(currentModuleFilter.value) || null;
  });

  // Filtering helpers
  const matchesModuleFilter = (moduleId: string | null) => {
    if (currentModuleFilter.value === 'any') return true;
    if (currentModuleFilter.value === 'none') return !moduleId;
    return moduleId === currentModuleFilter.value;
  };

  const matchesModuleFilterMultiple = (moduleIds: string[]) => {
    if (currentModuleFilter.value === 'any') return true;
    if (currentModuleFilter.value === 'none') return !moduleIds || moduleIds.length === 0;
    return moduleIds.includes(currentModuleFilter.value);
  };

  const setCurrentModuleFilter = (filter: string) => {
    configStore.currentModuleFilter = filter;
  };

  const getModuleName = (id: string | null) => {
    if (!id) return 'No Module';
    const module = base.items.value.find(m => m.id === id);
    return module?.name || 'Unknown Module';
  };

  async function create(module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>) {
    return await base.create(module);
  }

  async function update(id: string, patch: Partial<Omit<Module, 'id' | 'createdAt' | 'updatedAt'>>) {
    return await base.update(id, patch);
  }

  async function remove(id: string) {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  }

  return {
    ...base,
    filtered,
    sortedItems,
    currentModuleFilter,
    current,
    setCurrentModuleFilter,
    matchesModuleFilter,
    matchesModuleFilterMultiple,
    getModuleName,
    currentId,
    getById: base.getById,
    create,
    update,
    remove,
    setCurrentId: (id: string | null) => { currentId.value = id; },
    clearCurrent: () => { currentId.value = null; },
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },
    setSearchQuery: (query: string) => { searchQuery.value = query; },
    searchQuery,
  };
});
