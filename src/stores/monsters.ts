import { defineStore } from 'pinia';
import { computed } from 'vue';
import { Monster } from '@/types';
import { generateId, useStorage, isArray, hasRequiredFields } from '@/utils/storage';
import { useModuleStore } from './modules';
import monsterSchema from "@/schemas/monster.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";

registerValidationSchema('monster', monsterSchema);

const isMonster = (value: unknown): value is Monster => {
  return typeof value === 'object' && value !== null &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).type === 'string' &&
    typeof (value as any).size === 'string' &&
    typeof (value as any).alignment === 'string' &&
    typeof (value as any).armorClass === 'number' &&
    typeof (value as any).hitPoints === 'number' &&
    typeof (value as any).speed === 'object' &&
    typeof (value as any).abilities === 'object' &&
    Array.isArray((value as any).senses) &&
    Array.isArray((value as any).languages) &&
    typeof (value as any).challengeRating === 'number' &&
    typeof (value as any).xp === 'number' &&
    Array.isArray((value as any).actions) &&
    typeof (value as any).moduleId === 'string';
};

export const useMonsterStore = defineStore('monsters', () => {
  const monsters = useStorage<Monster[]>({
    key: 'dnd-monsters',
    defaultValue: [],
    validate: (data): data is Monster[] => 
      isArray(data) && data.every(monster => 
        isMonster(monster) && hasRequiredFields(monster as Monster, [
          'id', 'name', 'type', 'size', 'alignment', 'armorClass', 'hitPoints',
          'speed', 'abilities', 'senses', 'languages', 'challengeRating', 'xp',
          'actions', 'moduleId', 'createdAt', 'updatedAt'
        ])
      )
  });

  const currentMonsterId = useStorage<string | null>({
    key: 'dnd-current-monster',
    defaultValue: null
  });

  const currentMonster = computed(() => {
    if (!currentMonsterId.value) return null;
    return monsters.value.find(m => m.id === currentMonsterId.value) || null;
  });

  const addMonster = (monster: Omit<Monster, 'id'>) => {
    const newMonster: Monster = {
      ...monster,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    monsters.value.push(newMonster);
    return newMonster;
  };

  // Alias for addMonster to maintain compatibility
  const createMonster = addMonster;

  const updateMonster = (id: string, monster: Omit<Monster, 'id'>) => {
    const index = monsters.value.findIndex(m => m.id === id);
    if (index !== -1) {
      monsters.value[index] = {
        ...monster,
        id,
        createdAt: monsters.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };

  const deleteMonster = (id: string) => {
    monsters.value = monsters.value.filter(m => m.id !== id);
    if (currentMonsterId.value === id) {
      currentMonsterId.value = null;
    }
  };

  const setCurrentMonster = (id: string | null) => {
    currentMonsterId.value = id;
  };

  const getMonster = (id: string) => {
    return monsters.value.find(m => m.id === id) || null;
  };

  // Alias for getMonster to maintain compatibility
  const getMonsterById = getMonster;

  const loadMonsters = async () => {
    // Monsters are automatically loaded by useStorage
    return monsters.value;
  };

  const filteredMonsters = computed(() => {
    const moduleStore = useModuleStore();
    if (!moduleStore.currentModuleId) return monsters.value;
    return monsters.value.filter(m => m.moduleId === moduleStore.currentModuleId);
  });

  return {
    monsters,
    currentMonsterId,
    currentMonster,
    filteredMonsters,
    addMonster,
    createMonster,
    updateMonster,
    deleteMonster,
    setCurrentMonster,
    getMonster,
    getMonsterById,
    loadMonsters
  };
});
