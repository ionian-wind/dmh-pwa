import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Encounter } from '@/types';
import { generateId, useStorage, isArray, hasRequiredFields } from '@/utils/storage';
import { useModuleStore } from './modules';
import encounterSchema from "@/schemas/encounter.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';

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

export const useEncounterStore = defineStore('encounters', () => {
  // State
  const items = useStorage<Encounter[]>({
    key: 'dnd-encounters',
    defaultValue: [],
    validate: (data): data is Encounter[] => 
      isArray(data) && data.every(encounter => 
        isEncounter(encounter) && hasRequiredFields(encounter as Encounter, [
          'id', 'name', 'difficulty', 'monsters', 'currentRound',
          'currentTurn', 'moduleId', 'createdAt', 'updatedAt'
        ])
      )
  });
  const currentEncounterId = ref<string | null>(null);
  const isLoaded = ref(false);

  // Computed
  const currentEncounter = computed(() => {
    if (!currentEncounterId.value) return null;
    return items.value.find(e => e.id === currentEncounterId.value) || null;
  });
  const filteredEncounters = computed(() => {
    const moduleStore = useModuleStore();
    return items.value.filter(e => moduleStore.matchesModuleFilter(e.moduleId));
  });

  // CRUD
  const createEncounter = (encounter: Omit<Encounter, 'id'>) => {
    if (!encounter.moduleId) {
      throw new Error('Encounter must be associated with a module');
    }
    const newEncounter: Encounter = {
      ...encounter,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    items.value.push(newEncounter);
    return newEncounter;
  };
  const updateEncounter = (id: string, encounter: Omit<Encounter, 'id'>) => {
    const index = items.value.findIndex(e => e.id === id);
    if (index !== -1) {
      items.value[index] = {
        ...encounter,
        id,
        createdAt: items.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };
  const deleteEncounter = (id: string) => {
    items.value = items.value.filter(e => e.id !== id);
    if (currentEncounterId.value === id) currentEncounterId.value = null;
  };
  const getEncounterById = (id: string) => items.value.find(e => e.id === id) || null;
  const loadEncounters = async () => {
    isLoaded.value = false;
    // (simulate async load, but use items.value for now)
    isLoaded.value = true;
    return items.value;
  };

  // Monster/turn helpers (legacy)
  const addMonster = (encounterId: string, monsterId: string, count: number = 1) => {
    const encounter = items.value.find(e => e.id === encounterId);
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
    const encounter = items.value.find(e => e.id === encounterId);
    if (!encounter) return;
    if (!encounter.monsters) {
      encounter.monsters = {};
    }
    encounter.monsters = Object.fromEntries(Object.entries(encounter.monsters).filter(([key]) => key !== monsterId));
    encounter.updatedAt = Date.now();
  };
  const setMonsterCount = (encounterId: string, monsterId: string, count: number) => {
    const encounter = items.value.find(e => e.id === encounterId);
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
    const encounter = items.value.find(e => e.id === encounterId);
    if (!encounter || !encounter.monsters) return 0;
    return encounter.monsters[monsterId] || 0;
  };
  const updateTurn = (encounterId: string, round: number, turn: number) => {
    const encounter = items.value.find(e => e.id === encounterId);
    if (!encounter) return;
    encounter.currentRound = round;
    encounter.currentTurn = turn;
    encounter.updatedAt = Date.now();
  };
  const nextTurn = (encounterId: string) => {
    const encounter = items.value.find(e => e.id === encounterId);
    if (!encounter || !encounter.monsters) return;
    encounter.currentTurn++;
    if (encounter.currentTurn >= Object.keys(encounter.monsters).length) {
      encounter.currentTurn = 0;
      encounter.currentRound++;
    }
    encounter.updatedAt = Date.now();
  };
  const previousTurn = (encounterId: string) => {
    const encounter = items.value.find(e => e.id === encounterId);
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
    items.value = [...items.value];
  };

  // Legacy aliases
  const encounters = items;
  const addEncounter = createEncounter;
  const getEncounter = getEncounterById;

  return {
    items,
    currentEncounterId,
    currentEncounter,
    filteredEncounters,
    createEncounter,
    updateEncounter,
    deleteEncounter,
    getEncounterById,
    loadEncounters,
    isLoaded,
    // Monster/turn helpers
    addMonster,
    removeMonster,
    setMonsterCount,
    getMonsterCount,
    updateTurn,
    nextTurn,
    previousTurn,
    saveEncounters,
    // Legacy aliases
    encounters,
    addEncounter,
    getEncounter,
  };
});
