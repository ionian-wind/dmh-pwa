import { defineStore } from 'pinia';
import { computed } from 'vue';
import { Encounter } from '@/types';
import { generateId, useStorage, isArray, hasRequiredFields } from '@/utils/storage';
import { useModuleStore } from './modules';
import encounterSchema from "@/schemas/encounter.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";

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
  const encounters = useStorage<Encounter[]>({
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

  const currentEncounterId = useStorage<string | null>({
    key: 'dnd-current-encounter',
    defaultValue: null
  });

  const currentEncounter = computed(() => {
    if (!currentEncounterId.value) return null;
    return encounters.value.find(e => e.id === currentEncounterId.value) || null;
  });

  const addEncounter = (encounter: Omit<Encounter, 'id'>) => {
    // Ensure encounter has a moduleId
    if (!encounter.moduleId) {
      throw new Error('Encounter must be associated with a module');
    }
    
    const newEncounter: Encounter = {
      ...encounter,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    encounters.value.push(newEncounter);
    return newEncounter;
  };

  const createEncounter = addEncounter;

  const updateEncounter = (id: string, encounter: Omit<Encounter, 'id'>) => {
    const index = encounters.value.findIndex(e => e.id === id);
    if (index !== -1) {
      encounters.value[index] = {
        ...encounter,
        id,
        createdAt: encounters.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };

  const deleteEncounter = (id: string) => {
    encounters.value = encounters.value.filter(e => e.id !== id);
    if (currentEncounterId.value === id) {
      currentEncounterId.value = null;
    }
  };

  const setCurrentEncounter = (id: string | null) => {
    currentEncounterId.value = id;
  };

  const getEncounter = (id: string) => {
    return encounters.value.find(e => e.id === id) || null;
  };

  const getEncounterById = getEncounter;

  const filteredEncounters = computed(() => {
    const moduleStore = useModuleStore();
    return encounters.value.filter(e => moduleStore.matchesModuleFilter(e.moduleId));
  });

  const addMonster = (encounterId: string, monsterId: string, count: number = 1) => {
    const encounter = encounters.value.find(e => e.id === encounterId);
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
    const encounter = encounters.value.find(e => e.id === encounterId);
    if (!encounter) return;

    if (!encounter.monsters) {
      encounter.monsters = {};
    }

    encounter.monsters = Object.fromEntries(Object.entries(encounter.monsters).filter(([key]) => key !== monsterId));
    encounter.updatedAt = Date.now();
  };

  const setMonsterCount = (encounterId: string, monsterId: string, count: number) => {
    const encounter = encounters.value.find(e => e.id === encounterId);
    if (!encounter) return;

    if (!encounter.monsters) {
      encounter.monsters = {};
    }

    if (count <= 0) {
      removeMonster(encounterId, monsterId);
    } else {
      encounter.monsters[monsterId] = Math.min(count, 20); // Cap at 20
      encounter.updatedAt = Date.now();
    }
  };

  const getMonsterCount = (encounterId: string, monsterId: string): number => {
    const encounter = encounters.value.find(e => e.id === encounterId);
    if (!encounter || !encounter.monsters) return 0;
    return encounter.monsters[monsterId] || 0;
  };

  const updateTurn = (encounterId: string, round: number, turn: number) => {
    const encounter = encounters.value.find(e => e.id === encounterId);
    if (!encounter) return;

    encounter.currentRound = round;
    encounter.currentTurn = turn;
    encounter.updatedAt = Date.now();
  };

  const nextTurn = (encounterId: string) => {
    const encounter = encounters.value.find(e => e.id === encounterId);
    if (!encounter || !encounter.monsters) return;

    encounter.currentTurn++;
    if (encounter.currentTurn >= Object.keys(encounter.monsters).length) {
      encounter.currentTurn = 0;
      encounter.currentRound++;
    }
    encounter.updatedAt = Date.now();
  };

  const previousTurn = (encounterId: string) => {
    const encounter = encounters.value.find(e => e.id === encounterId);
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
    // This method is called to ensure encounters are saved to storage
    // The useStorage hook automatically handles persistence
    encounters.value = [...encounters.value];
  };

  const loadEncounters = async () => {
    // Encounters are automatically loaded by useStorage
    return encounters.value;
  };

  return {
    encounters,
    currentEncounterId,
    currentEncounter,
    filteredEncounters,
    addEncounter,
    createEncounter,
    updateEncounter,
    deleteEncounter,
    setCurrentEncounter,
    getEncounter,
    getEncounterById,
    addMonster,
    removeMonster,
    setMonsterCount,
    getMonsterCount,
    updateTurn,
    nextTurn,
    previousTurn,
    saveEncounters,
    loadEncounters
  };
});
