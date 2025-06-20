import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Combat, Combatant } from '@/types';
import combatSchema from "@/schemas/combat.schema.json";
import { useStore } from '@/utils/storage';

export const useCombatStore = defineStore('combats', () => {
  const base = useStore<Combat>({ storeName: 'combats', validationSchema: combatSchema });
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');

  async function create(combat: Omit<Combat, 'id' | 'createdAt' | 'updatedAt'>) {
    return await base.create(combat);
  }

  async function update(id: string, patch: Partial<Omit<Combat, 'id' | 'createdAt' | 'updatedAt'>>) {
    return await base.update(id, patch);
  }

  async function remove(id: string) {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  }

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(combat =>
        (combat.notes && combat.notes.toLowerCase().includes(query)) ||
        combat.combatants.some(c => c.name.toLowerCase().includes(query))
      );
    }
    return result;
  });

  const getById = (id: string): Combat | null => {
    return base.items.value.find(item => item.id === id) || null;
  };

  const sortedItems = computed(() => {
    return [...base.items.value].sort((a, b) => b.updatedAt - a.updatedAt);
  });

  // Combatant/turn helpers
  const getCombatByEncounter = (encounterId: string) =>
    base.items.value.find(c => c.encounterId === encounterId) || null;

  const getCombatByParty = (partyId: string) =>
    base.items.value.filter(c => c.partyId === partyId);

  const updateCombatant = (combatId: string, combatantId: string, updates: Partial<Combatant>) => {
    const combat = getById(combatId);
    if (!combat) return;
    const idx = combat.combatants.findIndex(c => c.id === combatantId);
    if (idx === -1) return;
    Object.assign(combat.combatants[idx], updates);
    update(combatId, { combatants: combat.combatants });
  };

  const removeCombatant = (combatId: string, combatantId: string) => {
    const combat = getById(combatId);
    if (!combat) return;
    combat.combatants = combat.combatants.filter(c => c.id !== combatantId);
    update(combatId, { combatants: combat.combatants });
  };

  const updateCombatStatus = (combatId: string, status: Combat['status']) => {
    update(combatId, { status });
  };

  return {
    ...base,
    filtered,
    currentId,
    getById,
    sortedItems,
    create,
    update,
    remove,
    getCombatByEncounter,
    getCombatByParty,
    updateCombatant,
    removeCombatant,
    updateCombatStatus,
    setCurrentId: (id: string | null) => { currentId.value = id; },
    clearCurrent: () => { currentId.value = null; },
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },
    setSearchQuery: (query: string) => { searchQuery.value = query; },
    searchQuery,
  };
}); 
