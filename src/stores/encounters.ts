import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Encounter } from '@/types';
import { useStore } from '@/utils/storage';
import encounterSchema from "@/schemas/encounter.schema.json";
import { useModuleStore } from '@/stores/modules';

export const useEncounterStore = defineStore('encounters', () => {
  const base = useStore<Encounter>({ storeName: 'encounters', validationSchema: encounterSchema });
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');
  const moduleStore = useModuleStore();

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(encounter =>
        encounter.name.toLowerCase().includes(query)
      );
    }
    // Module filter
    result = result.filter(encounter => moduleStore.matchesModuleFilter(encounter.moduleId || null));
    return result;
  });

  const sortedItems = base.sortedItems;

  const current = computed(() => {
    if (!currentId.value) return null;
    return base.getById(currentId.value) || null;
  });

  async function create(encounter: Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>) {
    return await base.create(encounter);
  }

  async function update(id: string, patch: Partial<Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>>) {
    return await base.update(id, patch);
  }

  async function remove(id: string) {
    await base.remove(id);
    if (currentId.value === id) currentId.value = null;
  }

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
