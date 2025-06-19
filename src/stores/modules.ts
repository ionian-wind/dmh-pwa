import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Module } from '@/types';
import { generateId, useStorage } from '@/utils/storage';
import moduleSchema from '../schemas/module.schema.json';
import {registerValidationSchema} from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';

registerValidationSchema('module', moduleSchema);

// Define module filter types
export type ModuleFilter = 'any' | 'none' | string | null;

export const useModuleStore = defineStore('modules', () => {
  // State
  const [items, loaded] = useStorage<Module[]>({
    key: 'dnd-modules',
    defaultValue: [],
    schema: 'module'
  });
  const currentModuleFilter = ref<ModuleFilter>('any');
  const isLoaded = loaded;

  // Computed
  const currentModule = computed(() => {
    if (!currentModuleFilter.value || currentModuleFilter.value === 'any' || currentModuleFilter.value === 'none') return null;
    return items.value.find(m => m.id === currentModuleFilter.value) || null;
  });

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

  // CRUD
  const createModule = (module: Omit<Module, 'id'>) => {
    const newModule: Module = {
      ...module,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    items.value.push(newModule);
    return newModule;
  };
  const updateModule = (id: string, module: Omit<Module, 'id'>) => {
    const index = items.value.findIndex(m => m.id === id);
    if (index !== -1) {
      items.value[index] = {
        ...module,
        id,
        createdAt: items.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };
  const deleteModule = (id: string) => {
    items.value = items.value.filter(m => m.id !== id);
    if (currentModuleFilter.value === id) {
      currentModuleFilter.value = 'any';
    }
  };
  const getModuleById = (id: string | null) => items.value.find(m => m.id === id) || null;
  const loadModules = async () => {
    return items.value;
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
    const module = items.value.find(m => m.id === id);
    return module?.name || 'Unknown Module';
  };

  // Legacy aliases
  const modules = items;

  return {
    items,
    currentModuleFilter,
    currentModule,
    matchesModuleFilter,
    matchesModuleFilterMultiple,
    createModule,
    updateModule,
    deleteModule,
    getModuleById,
    loadModules,
    isLoaded,
    setCurrentModuleFilter,
    setCurrentModule,
    getModuleName,
    // Legacy aliases
    modules,
  };
});
