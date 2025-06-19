import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Module } from '@/types';
import moduleSchema from '../schemas/module.schema.json';
import { registerValidationSchema } from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';
import { createBaseStore, type StandardizedStore } from './createBaseStore';

registerValidationSchema('module', moduleSchema);

// Define module filter types
export type ModuleFilter = 'any' | 'none' | string | null;

const baseStore = createBaseStore<Module>({
  storageKey: 'dnd-modules',
    schema: 'module'
  });

export const useModuleStore = defineStore('modules', (): StandardizedStore<Module> => {
  const base = baseStore();
  const currentModuleFilter = ref<ModuleFilter>('any');

  // Computed
  const current = computed(() => {
    if (!currentModuleFilter.value || currentModuleFilter.value === 'any' || currentModuleFilter.value === 'none') return null;
    return base.getById(currentModuleFilter.value) || null;
  });

  const filtered = computed(() => base.items.value);

  // Filtering helpers
  const matchesModuleFilter = (entityModuleId: string | null): boolean => {
    if (currentModuleFilter.value === 'any') return true;
    if (currentModuleFilter.value === 'none') return !entityModuleId;
    if (currentModuleFilter.value === null) return !entityModuleId;
    return entityModuleId === currentModuleFilter.value;
  };

  const matchesModuleFilterMultiple = (entityModuleIds: string[] | null | undefined): boolean => {
    if (currentModuleFilter.value === 'any') return true;
    if (currentModuleFilter.value === 'none') return !entityModuleIds || entityModuleIds.length === 0;
    if (currentModuleFilter.value === null) return !entityModuleIds || entityModuleIds.length === 0;
    return entityModuleIds?.includes(currentModuleFilter.value) || false;
  };

  // Extended CRUD operations with standardized names
  const create = async (module: Omit<Module, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newModule = await base.create(module);
    return newModule;
  };

  const update = async (id: string, module: Partial<Omit<Module, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updatedModule = await base.update(id, module);
    return updatedModule;
  };

  const remove = async (id: string) => {
    await base.remove(id);
    if (currentModuleFilter.value === id) {
      currentModuleFilter.value = 'any';
    }
  };

  const load = async () => {
    return base.load();
  };

  // No persistence for module filter
  const setCurrentModuleFilter = (filter: ModuleFilter) => {
    currentModuleFilter.value = filter;
  };

  const setCurrentModule = (id: string | null) => {
    if (id === null) {
      setCurrentModuleFilter('any');
    } else {
      setCurrentModuleFilter(id);
    }
  };

  const getModuleName = (id: string | null | undefined) => {
    if (!id) return 'Unknown Module';
    const module = base.getById(id);
    return module?.name || 'Unknown Module';
  };

  return {
    // State
    items: base.items,
    filtered,
    sortedItems: base.sortedItems,
    currentId: ref<string | null>(null),
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
    setCurrentId: (id: string | null) => { /* No currentId in modules */ },
    clearCurrent: () => { /* No currentId in modules */ },
    setFilter: (query: string) => { /* No search in modules */ },
    clearFilter: () => { /* No search in modules */ },

    // Additional computed properties
    searchQuery: ref(''),
    currentModuleFilter,
    setCurrentModuleFilter,
    matchesModuleFilter,
    matchesModuleFilterMultiple,
    getModuleName,
  };
});
