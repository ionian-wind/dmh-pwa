import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Party } from '@/types';
import { useStore } from '@/utils/storage';
import partySchema from "@/schemas/party.schema.json";
import { useModuleStore } from '@/stores/modules';

export const usePartyStore = defineStore('parties', () => {
  const base = useStore<Party>({ storeName: 'parties', validationSchema: partySchema });
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');
  const moduleStore = useModuleStore();

  async function create(party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>) {
    return await base.create(party);
  }

  async function update(id: string, patch: Partial<Omit<Party, 'id' | 'createdAt' | 'updatedAt'>>) {
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
      result = result.filter(party =>
        party.name.toLowerCase().includes(query)
      );
    }
    // Module filter
    result = result.filter(party => moduleStore.matchesModuleFilterMultiple(party.moduleIds || []));
    return result;
  });

  const sortedItems = base.sortedItems;

  const current = computed(() => {
    if (!currentId.value) return null;
    return base.getById(currentId.value) || null;
  });

  return {
    ...base,
    filtered,
    sortedItems,
    currentId,
    current,
    getById: base.getById,
    create,
    update,
    remove,
    setCurrentId: (id: string | null) => { currentId.value = id; },
    clearCurrent: () => { currentId.value = null; },
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },
    setSearchQuery: (query: string) => { searchQuery.value = query; },
    searchQuery,
  };
}); 
