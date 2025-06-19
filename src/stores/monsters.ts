import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Monster } from '@/types';
import { generateId, useStorage, isArray, hasRequiredFields } from '@/utils/storage';
import { useModuleStore } from './modules';
import monsterSchema from "@/schemas/monster.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';

registerValidationSchema('monster', monsterSchema);

const isMonster = (value: unknown): value is Monster => {
  return (
    typeof value === 'object' && value !== null &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).type === 'string' &&
    typeof (value as any).size === 'string' &&
    typeof (value as any).alignment === 'string' &&
    typeof (value as any).armorClass === 'number' &&
    typeof (value as any).hitPoints === 'number' &&
    typeof (value as any).speed === 'object' &&
    typeof (value as any).stats === 'object' &&
    Array.isArray((value as any).senses) &&
    Array.isArray((value as any).languages) &&
    typeof (value as any).challengeRating === 'number' &&
    typeof (value as any).xp === 'number' &&
    Array.isArray((value as any).actions) &&
    (typeof (value as any).moduleId === 'string' || typeof (value as any).moduleId === 'undefined' || (value as any).moduleId === null)
  );
};

export const useMonsterStore = defineStore('monsters', () => {
  // State
  const [items, loaded] = useStorage<Monster[]>({
    key: 'dnd-monsters',
    defaultValue: [],
    validate: (data): data is Monster[] => 
      isArray(data) && data.every(monster => 
        isMonster(monster) && hasRequiredFields(monster as Monster, [
          'id', 'name', 'type', 'size', 'alignment', 'armorClass', 'hitPoints',
          'speed', 'stats', 'senses', 'languages', 'challengeRating', 'xp',
          'actions', 'createdAt', 'updatedAt'
        ])
      )
  });
  const currentMonsterId = ref<string | null>(null);
  const isLoaded = loaded;

  // Computed
  const currentMonster = computed(() => {
    if (!currentMonsterId.value) return null;
    return items.value.find(m => m.id === currentMonsterId.value) || null;
  });
  const filteredMonsters = computed(() => {
    const moduleStore = useModuleStore();
    return items.value.filter(m => moduleStore.matchesModuleFilterMultiple(m.moduleIds));
  });

  // CRUD
  const createMonster = (monster: Omit<Monster, 'id'>) => {
    const newMonster: Monster = {
      ...monster,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    items.value.push(newMonster);
    return newMonster;
  };
  const updateMonster = (id: string, monster: Omit<Monster, 'id'>) => {
    const index = items.value.findIndex(m => m.id === id);
    if (index !== -1) {
      items.value[index] = {
        ...monster,
        id,
        createdAt: items.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };
  const deleteMonster = (id: string) => {
    items.value = items.value.filter(m => m.id !== id);
    if (currentMonsterId.value === id) currentMonsterId.value = null;
  };
  const getMonsterById = (id: string) => items.value.find(m => m.id === id) || null;
  const loadMonsters = async () => {
    // (simulate async load, but use items.value for now)
    return items.value;
  };

  // Helpers
  const setCurrentMonster = (id: string | null) => {
    currentMonsterId.value = id;
  };

  // Legacy aliases
  const monsters = items;
  const addMonster = createMonster;
  const getMonster = getMonsterById;

  return {
    items,
    currentMonsterId,
    currentMonster,
    filteredMonsters,
    createMonster,
    updateMonster,
    deleteMonster,
    getMonsterById,
    loadMonsters,
    isLoaded,
    setCurrentMonster,
    // Legacy aliases
    monsters,
    addMonster,
    getMonster,
  };
});
