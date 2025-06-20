import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Character } from '@/types';
import { useStore } from '@/utils/storage';
import characterSchema from '@/schemas/character.schema.json';

export const useCharacterStore = defineStore('characters', () => {
  const base = useStore<Character>({ storeName: 'characters', validationSchema: characterSchema });
  const currentId = ref<string | null>(null);
  const searchQuery = ref('');

  async function create(character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) {
    return await base.create(character);
  }

  async function update(id: string, patch: Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>) {
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
      result = result.filter(character =>
        character.name.toLowerCase().includes(query)
      );
    }
    return result;
  });

  return {
    ...base,
    filtered,
    currentId,
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
