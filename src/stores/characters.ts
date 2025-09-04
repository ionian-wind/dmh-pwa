import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Character } from '@/types';
import { useStore } from '@/utils/storage';
import characterSchema from '@/schemas/character.schema.json';

export const useCharacterStore = defineStore('characters', () => {
  const base = useStore<Character>({
    storeName: 'characters',
    validationSchema: characterSchema,
  });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((character) =>
        character.name.toLowerCase().includes(query),
      );
    }
    return result;
  });

  return {
    ...base,
    filtered,
    setFilter: (query: string) => {
      searchQuery.value = query;
    },
    clearFilter: () => {
      searchQuery.value = '';
    },
    setSearchQuery: (query: string) => {
      searchQuery.value = query;
    },
    searchQuery,
  };
});
