import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Monster } from '@/types';
import { useStore } from '@/utils/storage'
import monsterSchema from "@/schemas/monster.schema.json";

export const useMonsterStore = defineStore('monsters', () => {
  const base = useStore<Monster>({ storeName: 'monsters', validationSchema: monsterSchema });
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');

  async function create(monster: Omit<Monster, 'id' | 'createdAt' | 'updatedAt'>) {
    return await base.create(monster);
  }

  async function update(id: string, patch: Partial<Omit<Monster, 'id' | 'createdAt' | 'updatedAt'>>) {
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
      result = result.filter(monster =>
        monster.name.toLowerCase().includes(query)
      );
    }
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
