import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { Combat, Combatant } from '@/types';
import { generateId, useStorage, isArray, hasRequiredFields } from '@/utils/storage';
import { useModuleStore } from './modules';
import combatSchema from "@/schemas/combat.schema.json";
import {registerValidationSchema} from "@/utils/schemaValidator";

registerValidationSchema('combat', combatSchema);

const isCombat = (value: unknown): value is Combat => {
  return typeof value === 'object' && value !== null &&
    typeof (value as any).encounterId === 'string' &&
    typeof (value as any).partyId === 'string' &&
    typeof (value as any).status === 'string' &&
    typeof (value as any).currentRound === 'number' &&
    typeof (value as any).currentTurn === 'number' &&
    Array.isArray((value as any).combatants);
};

export const useCombatStore = defineStore('combats', () => {
  // State
  const items = useStorage<Combat[]>({
    key: 'dnd-combats',
    defaultValue: [],
    validate: (data): data is Combat[] => 
      isArray(data) && data.every(combat => 
        isCombat(combat) && hasRequiredFields(combat as Combat, [
          'id', 'encounterId', 'partyId', 'status', 'currentRound',
          'currentTurn', 'combatants', 'createdAt', 'updatedAt'
        ])
      )
  });
  const currentCombatId = ref<string | null>(null);

  // Computed
  const currentCombat = computed(() => {
    if (!currentCombatId.value) return null;
    return items.value.find(c => c.id === currentCombatId.value) || null;
  });

  // CRUD
  const createCombat = (combat: Omit<Combat, 'id'>) => {
    const newCombat: Combat = {
      ...combat,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    items.value.push(newCombat);
    return newCombat;
  };
  const updateCombat = (id: string, combat: Omit<Combat, 'id'>) => {
    const index = items.value.findIndex(c => c.id === id);
    if (index !== -1) {
      items.value[index] = {
        ...combat,
        id,
        createdAt: items.value[index].createdAt,
        updatedAt: Date.now()
      };
    }
  };
  const deleteCombat = (id: string) => {
    items.value = items.value.filter(c => c.id !== id);
    if (currentCombatId.value === id) currentCombatId.value = null;
  };
  const getCombatById = (id: string) => items.value.find(c => c.id === id) || null;
  const loadCombats = async () => items.value;

  // Combatant/turn helpers (legacy)
  const getCombatByEncounter = (encounterId: string) => items.value.find(c => c.encounterId === encounterId) || null;
  const getCombatByParty = (partyId: string) => items.value.filter(c => c.partyId === partyId);
  const updateCombatant = (combatId: string, combatantId: string, updates: Partial<Combatant>) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat) return;
    const combatantIndex = combat.combatants.findIndex(c => c.id === combatantId);
    if (combatantIndex === -1) return;
    combat.combatants[combatantIndex] = {
      ...combat.combatants[combatantIndex],
      ...updates
    };
    combat.updatedAt = Date.now();
  };
  const addCombatant = (combatId: string, combatant: Combatant) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat) return;
    combat.combatants.push(combatant);
    combat.updatedAt = Date.now();
  };
  const removeCombatant = (combatId: string, combatantId: string) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat) return;
    combat.combatants = combat.combatants.filter(c => c.id !== combatantId);
    combat.updatedAt = Date.now();
  };
  const updateCombatStatus = (combatId: string, status: Combat['status']) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat) return;
    combat.status = status;
    combat.updatedAt = Date.now();
  };
  const updateTurn = (combatId: string, round: number, turn: number) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat) return;
    combat.currentRound = round;
    combat.currentTurn = turn;
    combat.updatedAt = Date.now();
  };
  const nextTurn = (combatId: string) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat || !combat.combatants) return;
    combat.currentTurn++;
    if (combat.currentTurn >= combat.combatants.length) {
      combat.currentTurn = 0;
      combat.currentRound++;
    }
    combat.updatedAt = Date.now();
  };
  const previousTurn = (combatId: string) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat || !combat.combatants) return;
    combat.currentTurn--;
    if (combat.currentTurn < 0) {
      if (combat.currentRound > 1) {
        combat.currentRound--;
        combat.currentTurn = combat.combatants.length - 1;
      } else {
        combat.currentTurn = 0;
      }
    }
    combat.updatedAt = Date.now();
  };
  const endCombat = (combatId: string) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat) return;
    combat.status = 'completed';
    combat.updatedAt = Date.now();
  };
  const startCombat = (combatId: string) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat) return;
    combat.status = 'active';
    combat.currentRound = 1;
    combat.currentTurn = 0;
    combat.updatedAt = Date.now();
  };
  const resetCombat = (combatId: string) => {
    const combat = items.value.find(c => c.id === combatId);
    if (!combat || !combat.combatants) return;
    combat.status = 'preparing';
    combat.currentRound = 0;
    combat.currentTurn = 0;
    combat.combatants.forEach(combatant => {
      combatant.hitPoints.current = combatant.hitPoints.maximum;
      combatant.hitPoints.temporary = 0;
      combatant.conditions = [];
    });
    combat.updatedAt = Date.now();
  };

  // Legacy aliases
  const combats = items;
  const addCombat = createCombat;
  const getCombat = getCombatById;

  return {
    items,
    currentCombatId,
    currentCombat,
    createCombat,
    updateCombat,
    deleteCombat,
    getCombatById,
    loadCombats,
    // Combatant/turn helpers
    getCombatByEncounter,
    getCombatByParty,
    updateCombatant,
    addCombatant,
    removeCombatant,
    updateCombatStatus,
    updateTurn,
    nextTurn,
    previousTurn,
    endCombat,
    startCombat,
    resetCombat,
    // Legacy aliases
    combats,
    addCombat,
    getCombat,
  };
}); 