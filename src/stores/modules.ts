import { defineStore } from 'pinia';
import { computed } from 'vue';
import { Module } from '@/types';
import { generateId, useStorage } from '@/utils/storage';
import moduleSchema from '../schemas/module.schema.json';
import {registerValidationSchema} from "@/utils/schemaValidator";

registerValidationSchema('module', moduleSchema);

export const useModuleStore = defineStore('modules', () => {
  const modules = useStorage<Module[]>({
    key: 'dnd-modules',
    defaultValue: [],
    schema: 'module'
  });

  const currentModuleId = useStorage<string | null>({
    key: 'dnd-current-module',
    defaultValue: null
  });
  
  const currentModule = computed(() => {
    if (!currentModuleId.value) return null;
    return modules.value.find(m => m.id === currentModuleId.value) || null;
  });

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
    if (currentModuleId.value === id) {
      currentModuleId.value = null;
    }
  };

  const setCurrentModule = (id: string | null) => {
    currentModuleId.value = id;
  };

  const getModuleName = (id: string) => {
    const module = modules.value.find(m => m.id === id);
    return module?.name || 'Unknown Module';
  };

  const getModuleById = (id: string) => {
    return modules.value.find(m => m.id === id) || null;
  };
  

  const loadModules = async () => {
    // Modules are automatically loaded by useStorage
    return modules.value;
  };

  return {
    modules,
    currentModuleId,
    currentModule,
    addModule,
    createModule,
    updateModule,
    deleteModule,
    setCurrentModule,
    getModuleName,
    getModuleById,
    loadModules
  };
});
