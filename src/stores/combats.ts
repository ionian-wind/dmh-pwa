import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Combat, Combatant } from '@/types';
import { isArray, hasRequiredFields, migrateStorageData, migrateCombatData } from '@/utils/storage';
import { useModuleStore } from './modules';
import combatSchema from "@/schemas/combat.schema.json";
import { registerValidationSchema } from "@/utils/schemaValidator";
import { extractMentionedEntities } from '@/utils/markdownParser';
import { createBaseStore, type StandardizedStore } from './createBaseStore';

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

const baseStore = createBaseStore<Combat>({
  storageKey: 'dnd-combats',
  validate: (data): data is Combat[] => 
    isArray(data) && data.every(combat => 
      isCombat(combat) && hasRequiredFields(combat as Combat, [
        'id', 'encounterId', 'partyId', 'status', 'currentRound',
        'currentTurn', 'combatants', 'createdAt', 'updatedAt'
      ])
    ),
  schema: 'combat'
});

export const useCombatStore = defineStore('combats', (): StandardizedStore<Combat> => {
  const base = baseStore();
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');

  // Computed
  const current = computed(() => {
    if (!currentId.value) return null;
    return base.getById(currentId.value) || null;
  });

  const filtered = computed(() => {
    if (searchQuery.value === '') return base.items.value;
    return base.items.value.filter(combat => {
      const search = searchQuery.value.toLowerCase();
      return (
        combat.encounterId.toLowerCase().includes(search) ||
        combat.partyId.toLowerCase().includes(search) ||
        combat.status.toLowerCase().includes(search)
      );
    });
  });

  // Extended CRUD operations with standardized names
  const create = async (combat: Omit<Combat, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCombat = await base.create(combat);
    return newCombat;
  };

  const update = async (id: string, combat: Partial<Omit<Combat, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const updatedCombat = await base.update(id, combat);
    return updatedCombat;
  };

  const remove = async (id: string) => {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  };

  const load = async () => {
    // Run migration first if data exists but validation fails
    try {
      const migratedData = await migrateStorageData('dnd-combats', migrateCombatData, []);
      if (migratedData.length > 0 && base.items.value.length === 0) {
        // Only update if we have migrated data and no current data
        base.items.value = migratedData;
        console.log(`[Combats] Migrated ${migratedData.length} combats`);
      }
    } catch (e) {
      console.warn('[Combats] Migration failed:', e);
    }
    
    // Then load normally
    return base.load();
  };

  // Combatant/turn helpers
  const getCombatByEncounter = (encounterId: string) => 
    base.items.value.find(c => c.encounterId === encounterId) || null;

  const getCombatByParty = (partyId: string) => 
    base.items.value.filter(c => c.partyId === partyId);

  const updateCombatant = (combatId: string, combatantId: string, updates: Partial<Combatant>) => {
    const combat = base.getById(combatId);
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
    const combat = base.getById(combatId);
    if (!combat) return;
    combat.combatants.push(combatant);
    combat.updatedAt = Date.now();
  };

  const removeCombatant = (combatId: string, combatantId: string) => {
    const combat = base.getById(combatId);
    if (!combat) return;
    combat.combatants = combat.combatants.filter(c => c.id !== combatantId);
    combat.updatedAt = Date.now();
  };

  const updateCombatStatus = (combatId: string, status: Combat['status']) => {
    const combat = base.getById(combatId);
    if (!combat) return;
    combat.status = status;
    combat.updatedAt = Date.now();
  };

  const updateTurn = (combatId: string, round: number, turn: number) => {
    const combat = base.getById(combatId);
    if (!combat) return;
    combat.currentRound = round;
    combat.currentTurn = turn;
    combat.updatedAt = Date.now();
  };

  const nextTurn = (combatId: string) => {
    const combat = base.getById(combatId);
    if (!combat || !combat.combatants) return;
    combat.currentTurn++;
    if (combat.currentTurn >= combat.combatants.length) {
      combat.currentTurn = 0;
      combat.currentRound++;
    }
    combat.updatedAt = Date.now();
  };

  const previousTurn = (combatId: string) => {
    const combat = base.getById(combatId);
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
    const combat = base.getById(combatId);
    if (!combat) return;
    combat.status = 'completed';
    combat.updatedAt = Date.now();
  };

  const startCombat = (combatId: string) => {
    const combat = base.getById(combatId);
    if (!combat) return;
    combat.status = 'active';
    combat.currentRound = 1;
    combat.currentTurn = 0;
    combat.updatedAt = Date.now();
  };

  const resetCombat = (combatId: string) => {
    const combat = base.getById(combatId);
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
    addCombatant,
    removeCombatant,
    updateCombatant,
    nextTurn,
    previousTurn,
    startCombat,
    endCombat,
    resetCombat,
  };
}); 