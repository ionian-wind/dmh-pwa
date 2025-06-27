import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Combat, Combatant } from '@/types';
import combatSchema from "@/schemas/combat.schema.json";
import { useStore } from '@/utils/storage';

export const useCombatStore = defineStore('combats', () => {
  const base = useStore<Combat>({ storeName: 'combats', validationSchema: combatSchema });
  const searchQuery = ref('');

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

   const sortedItems = computed(() => {
    return [...base.items.value].sort((a, b) => b.updatedAt - a.updatedAt);
  });

  // Combatant/turn helpers
  const getCombatByEncounter = (encounterId: string) =>
    base.items.value.find(c => c.encounterId === encounterId) || null;

  const getCombatByParty = (partyId: string) =>
    base.items.value.filter(c => c.partyId === partyId);

  const updateCombatant = (combatId: string, combatantId: string, updates: Partial<Combatant>) => {
    const combat = base.getById(combatId);
    if (!combat) return;
    const idx = combat.combatants.findIndex(c => c.id === combatantId);
    if (idx === -1) return;
    Object.assign(combat.combatants[idx], updates);
    return base.update(combatId, { combatants: combat.combatants });
  };

  const removeCombatant = (combatId: string, combatantId: string) => {
    const combat = base.getById(combatId);
    if (!combat) return;
    combat.combatants = combat.combatants.filter(c => c.id !== combatantId);
    return base.update(combatId, { combatants: combat.combatants });
  };

  const updateCombatStatus = (combatId: string, status: Combat['status']) => {
    return base.update(combatId, { status });
  };

  function startCombat(id: string) {
    const combat = base.getById(id);
    if (!combat) return;
    if (combat.status !== 'preparing') return;
    return base.update(id, {
      status: 'active',
      currentRound: 1,
      currentTurn: 0,
    });
  }

  function endCombat(id: string) {
    const combat = base.getById(id);
    if (!combat) return;
    if (combat.status !== 'active') return;
    return base.update(id, {
      status: 'completed',
    });
  }

  function resetCombat(id: string) {
    const combat = base.getById(id);
    if (!combat) return;
    if (combat.status !== 'active') return;
    return base.update(id, {
      currentRound: 1,
      currentTurn: 0,
    });
  }

  function nextTurn(id: string) {
    const combat = base.getById(id);
    if (!combat || combat.status !== 'active') return;
    let nextTurn = combat.currentTurn + 1;
    let nextRound = combat.currentRound;
    if (nextTurn >= combat.combatants.length) {
      nextTurn = 0;
      nextRound += 1;
    }
    return base.update(id, {
      currentTurn: nextTurn,
      currentRound: nextRound,
    });
  }

  function previousTurn(id: string) {
    const combat = base.getById(id);
    if (!combat || combat.status !== 'active') return;
    let prevTurn = combat.currentTurn - 1;
    let prevRound = combat.currentRound;
    if (prevTurn < 0) {
      prevTurn = combat.combatants.length - 1;
      prevRound = Math.max(1, prevRound - 1);
    }
    return base.update(id, {
      currentTurn: prevTurn,
      currentRound: prevRound,
    });
  }

  return {
    ...base,
    filtered,
    sortedItems,
    getCombatByEncounter,
    getCombatByParty,
    updateCombatant,
    removeCombatant,
    updateCombatStatus,
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },
    setSearchQuery: (query: string) => { searchQuery.value = query; },
    searchQuery,
    startCombat,
    endCombat,
    resetCombat,
    nextTurn,
    previousTurn,
  };
}); 
