import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Sheet } from '@/sheets/types/sheet.types';
import { useStore } from '@/utils/storage';
import sheetSchema from '@/schemas/sheet.schema.json';

export const useSheetStore = defineStore('sheets', () => {
  const base = useStore<Sheet>({
    storeName: 'sheets',
    validationSchema: sheetSchema,
  });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((sheet) =>
        sheet.name.toLowerCase().includes(query),
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
