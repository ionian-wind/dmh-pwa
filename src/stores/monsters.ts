import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Monster } from '@/types';
import { isArray, hasRequiredFields, migrateStorageData, migrateMonsterData } from '@/utils/storage';
import { useModuleStore } from './modules';
import monsterSchema from "@/schemas/monster.schema.json";
import { registerValidationSchema } from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';
import { createBaseStore, type StandardizedStore } from './createBaseStore';

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

const baseStore = createBaseStore<Monster>({
  storageKey: 'dnd-monsters',
    validate: (data): data is Monster[] => 
      isArray(data) && data.every(monster => 
        isMonster(monster) && hasRequiredFields(monster as Monster, [
          'id', 'name', 'type', 'size', 'alignment', 'armorClass', 'hitPoints',
          'speed', 'stats', 'senses', 'languages', 'challengeRating', 'xp',
          'actions', 'createdAt', 'updatedAt'
        ])
    ),
  schema: 'monster'
  });

export const useMonsterStore = defineStore('monsters', (): StandardizedStore<Monster> => {
  const base = baseStore();
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');

  // Computed
  const current = computed(() => {
    if (!currentId.value) return null;
    return base.getById(currentId.value) || null;
  });

  const filtered = computed(() => {
    const moduleStore = useModuleStore();
    let result = base.items.value.filter(m => moduleStore.matchesModuleFilterMultiple(m.moduleIds));
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(monster =>
        monster.name.toLowerCase().includes(query) ||
        monster.type.toLowerCase().includes(query) ||
        monster.description.toLowerCase().includes(query)
      );
    }
    
    return result;
  });

  // Extended CRUD operations with standardized names
  const create = async (monster: Omit<Monster, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newMonster = await base.create(monster);
    return newMonster;
  };

  const update = async (id: string, monster: Partial<Omit<Monster, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updatedMonster = await base.update(id, monster);
    return updatedMonster;
  };

  const remove = async (id: string) => {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  };

  const load = async () => {
    // Run migration first if data exists but validation fails
    try {
      const migratedData = await migrateStorageData('dnd-monsters', migrateMonsterData, []);
      if (migratedData.length > 0 && base.items.value.length === 0) {
        // Only update if we have migrated data and no current data
        base.items.value = migratedData;
        console.log(`[Monsters] Migrated ${migratedData.length} monsters`);
      }
    } catch (e) {
      console.warn('[Monsters] Migration failed:', e);
    }
    
    // Then load normally
    return base.load();
  };

  // Helpers
  const setCurrentMonster = (id: string | null) => {
    currentId.value = id;
  };

  return {
    // State
    items: base.items,
    filtered,
    sortedItems: base.sortedItems,
    currentId,
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
    setCurrentId: (id: string | null) => { currentId.value = id; },
    clearCurrent: () => { currentId.value = null; },
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },

    // Additional computed properties
    searchQuery,
  };
});
