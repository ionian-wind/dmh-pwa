import { computed, ref } from 'vue';
import { usePartyStore } from '@/stores/parties';

/**
 * Shared party filter for the characters list and its sidebar. Playlists use a
 * similar selection so the characters page can group characters by party
 * without a separate parties page.
 */
const selectedPartyId = ref<string | null>(null);

export function useSelectedParty() {
  const partyStore = usePartyStore();

  const selectedParty = computed(() =>
    selectedPartyId.value
      ? (partyStore.getById(selectedPartyId.value) ?? null)
      : null,
  );

  const selectedCharacterIds = computed(
    () => new Set(selectedParty.value?.characters ?? []),
  );

  function selectParty(id: string | null): void {
    selectedPartyId.value = id;
  }

  function clearSelection(): void {
    selectedPartyId.value = null;
  }

  return {
    selectedPartyId,
    selectedParty,
    selectedCharacterIds,
    selectParty,
    clearSelection,
  };
}
