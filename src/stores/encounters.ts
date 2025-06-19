import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Encounter } from '@/types';
import { isArray, hasRequiredFields, migrateStorageData, migrateEncounterData } from '@/utils/storage';
import { useModuleStore } from './modules';
import encounterSchema from "@/schemas/encounter.schema.json";
import { registerValidationSchema } from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';
import { createBaseStore, type StandardizedStore } from './createBaseStore';

registerValidationSchema('encounter', encounterSchema);

const isEncounter = (value: unknown): value is Encounter => {
  return typeof value === 'object' && value !== null &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).difficulty === 'string' &&
    typeof (value as any).monsters === 'object' &&
    typeof (value as any).currentRound === 'number' &&
    typeof (value as any).currentTurn === 'number' &&
    typeof (value as any).moduleId === 'string';
};

const baseStore = createBaseStore<Encounter>({
  storageKey: 'dnd-encounters',
  validate: (data): data is Encounter[] => 
    isArray(data) && data.every(encounter => 
      isEncounter(encounter) && hasRequiredFields(encounter as Encounter, [
        'id', 'name', 'difficulty', 'monsters', 'currentRound',
        'currentTurn', 'moduleId', 'createdAt', 'updatedAt'
      ])
    ),
  schema: 'encounter'
});

export const useEncounterStore = defineStore('encounters', (): StandardizedStore<Encounter> => {
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
    return base.items.value.filter(e => moduleStore.matchesModuleFilter(e.moduleId));
  });

  // Extended CRUD operations with standardized names
  const create = async (encounter: Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!encounter.moduleId) {
      throw new Error('Encounter must be associated with a module');
    }
    const newEncounter = await base.create(encounter);
    return newEncounter;
  };

  const update = async (id: string, encounter: Partial<Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updatedEncounter = await base.update(id, encounter);
    return updatedEncounter;
  };

  const remove = async (id: string) => {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  };

  const load = async () => {
    // Run migration first if data exists but validation fails
    try {
      const migratedData = await migrateStorageData('dnd-encounters', migrateEncounterData, []);
      if (migratedData.length > 0 && base.items.value.length === 0) {
        // Only update if we have migrated data and no current data
        base.items.value = migratedData;
        console.log(`[Encounters] Migrated ${migratedData.length} encounters`);
      }
    } catch (e) {
      console.warn('[Encounters] Migration failed:', e);
    }
    
    // Then load normally
    return base.load();
  };

  // Monster/turn helpers
  const addMonster = (encounterId: string, monsterId: string, count: number = 1) => {
    const encounter = base.getById(encounterId);
    if (!encounter) return;
    if (!encounter.monsters) {
      encounter.monsters = {};
    }
    if (!encounter.monsters[monsterId]) {
      encounter.monsters[monsterId] = count;
      encounter.updatedAt = Date.now();
    }
  };

  const removeMonster = (encounterId: string, monsterId: string) => {
    const encounter = base.getById(encounterId);
    if (!encounter) return;
    if (!encounter.monsters) {
      encounter.monsters = {};
    }
    encounter.monsters = Object.fromEntries(Object.entries(encounter.monsters).filter(([key]) => key !== monsterId));
    encounter.updatedAt = Date.now();
  };

  const setMonsterCount = (encounterId: string, monsterId: string, count: number) => {
    const encounter = base.getById(encounterId);
    if (!encounter) return;
    if (!encounter.monsters) {
      encounter.monsters = {};
    }
    if (count <= 0) {
      removeMonster(encounterId, monsterId);
    } else {
      encounter.monsters[monsterId] = Math.min(count, 20);
      encounter.updatedAt = Date.now();
    }
  };

  const getMonsterCount = (encounterId: string, monsterId: string): number => {
    const encounter = base.getById(encounterId);
    if (!encounter || !encounter.monsters) return 0;
    return encounter.monsters[monsterId] || 0;
  };

  const updateTurn = (encounterId: string, round: number, turn: number) => {
    const encounter = base.getById(encounterId);
    if (!encounter) return;
    encounter.currentRound = round;
    encounter.currentTurn = turn;
    encounter.updatedAt = Date.now();
  };

  const nextTurn = (encounterId: string) => {
    const encounter = base.getById(encounterId);
    if (!encounter || !encounter.monsters) return;
    encounter.currentTurn++;
    if (encounter.currentTurn >= Object.keys(encounter.monsters).length) {
      encounter.currentTurn = 0;
      encounter.currentRound++;
    }
    encounter.updatedAt = Date.now();
  };

  const previousTurn = (encounterId: string) => {
    const encounter = base.getById(encounterId);
    if (!encounter || !encounter.monsters) return;
    encounter.currentTurn--;
    if (encounter.currentTurn < 0) {
      if (encounter.currentRound > 1) {
        encounter.currentRound--;
        encounter.currentTurn = Object.keys(encounter.monsters).length - 1;
      } else {
        encounter.currentTurn = 0;
      }
    }
    encounter.updatedAt = Date.now();
  };

  const saveEncounters = () => {
    // This is now handled automatically by the base store
  };

  const getMonsterDetails = (encounterId: string, monsterId: string) => {
    const encounter = base.getById(encounterId);
    if (!encounter || !encounter.monsters) return null;
    const count = encounter.monsters[monsterId] || 0;
    return { monsterId, count };
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
    setMonsterCount,
    getMonsterCount,
    getMonsterDetails,
  };
});
