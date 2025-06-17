import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Module } from '@/types';
import { generateId, useStorage } from '@/utils/storage';
import moduleSchema from '../schemas/module.schema.json';
import {registerValidationSchema} from "@/utils/schemaValidator";

registerValidationSchema('module', moduleSchema);

// Define module filter types
export type ModuleFilter = 'any' | 'none' | string | null;

export const useModuleStore = defineStore('modules', () => {
  const modules = useStorage<Module[]>({
    key: 'dnd-modules',
    defaultValue: [],
    schema: 'module'
  });

  // Use simple localStorage for the module filter since it's just a string
  const getStoredModuleFilter = (): ModuleFilter => {
    try {
      const stored = localStorage.getItem('dnd-current-module-filter');
      if (stored === null) return 'any';
      return stored as ModuleFilter;
    } catch (e) {
      console.error('Error reading module filter from storage:', e);
      return 'any';
    }
  };

  const setStoredModuleFilter = (filter: ModuleFilter) => {
    try {
      localStorage.setItem('dnd-current-module-filter', filter || 'any');
    } catch (e) {
      console.error('Error saving module filter to storage:', e);
    }
  };

  const currentModuleFilter = ref<ModuleFilter>(getStoredModuleFilter());
  
  const currentModule = computed(() => {
    if (!currentModuleFilter.value || currentModuleFilter.value === 'any' || currentModuleFilter.value === 'none') return null;
    return modules.value.find(m => m.id === currentModuleFilter.value) || null;
  });

  // Helper function to check if an entity matches the current filter
  const matchesModuleFilter = (entityModuleId: string | null): boolean => {
    if (currentModuleFilter.value === 'any') return true;
    if (currentModuleFilter.value === 'none') return !entityModuleId;
    if (currentModuleFilter.value === null) return !entityModuleId;
    return entityModuleId === currentModuleFilter.value;
  };

  // Helper function to check if an entity with multiple modules matches the current filter
  const matchesModuleFilterMultiple = (entityModuleIds: string[] | null | undefined): boolean => {
    if (currentModuleFilter.value === 'any') return true;
    if (currentModuleFilter.value === 'none') return !entityModuleIds || entityModuleIds.length === 0;
    if (currentModuleFilter.value === null) return !entityModuleIds || entityModuleIds.length === 0;
    return entityModuleIds?.includes(currentModuleFilter.value) || false;
  };

  const addModule = (module: Omit<Module, 'id'>) => {
    const newModule: Module = {
      ...module,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    modules.value.push(newModule);
    return newModule;
  };

  const createModule = addModule;

  const updateModule = (id: string, module: Omit<Module, 'id'>) => {
    const index = modules.value.findIndex(m => m.id === id);
    if (index !== -1) {
      modules.value[index] = {
        ...module,
        id,
        createdAt: modules.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };

  const deleteModule = (id: string) => {
    modules.value = modules.value.filter(m => m.id !== id);
    if (currentModuleFilter.value === id) {
      currentModuleFilter.value = 'any';
      setStoredModuleFilter('any');
    }
  };

  const setCurrentModuleFilter = (filter: ModuleFilter) => {
    currentModuleFilter.value = filter;
    setStoredModuleFilter(filter);
  };

  // Legacy function for backward compatibility
  const setCurrentModule = (id: string | null) => {
    if (id === null) {
      setCurrentModuleFilter('any');
    } else {
      setCurrentModuleFilter(id);
    }
  };

  const getModuleName = (id: string) => {
    const module = modules.value.find(m => m.id === id);
    return module?.name || 'Unknown Module';
  };

  const getModuleById = (id: string | null) => {
    return modules.value.find(m => m.id === id) || null;
  };
  

  const loadModules = async () => {
    // Modules are automatically loaded by useStorage
    return modules.value;
  };

  return {
    modules,
    currentModuleFilter,
    currentModule,
    matchesModuleFilter,
    matchesModuleFilterMultiple,
    addModule,
    createModule,
    updateModule,
    deleteModule,
    setCurrentModuleFilter,
    setCurrentModule,
    getModuleName,
    getModuleById,
    loadModules
  };
});
