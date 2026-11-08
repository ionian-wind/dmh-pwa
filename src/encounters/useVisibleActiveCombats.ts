import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useCombatStore } from '@/stores/combats';

/**
 * Active combats that belong in the global combat sidebar. The combat whose
 * detail page is currently open is omitted because its controls are already on
 * screen.
 */
export function useVisibleActiveCombats() {
  const route = useRoute();
  const combatStore = useCombatStore();

  const openedCombatId = computed(() =>
    route.name === 'combat-detail' ? String(route.params.id ?? '') : '',
  );

  const activeCombats = computed(() =>
    combatStore.items.filter((combat) => combat.status === 'active'),
  );

  const visibleActiveCombats = computed(() =>
    activeCombats.value.filter((combat) => combat.id !== openedCombatId.value),
  );

  return { activeCombats, visibleActiveCombats, openedCombatId };
}
