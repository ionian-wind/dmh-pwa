import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MapEntity, MapFile } from './types';
import { useStore, idbGetItem, idbPutItem, idbDeleteItem, idbGetAllItems } from '@/utils/storage';
import mapSchema from './schemas/map.schema.json';

export const useMapStore = defineStore('maps', () => {
  const base = useStore<MapEntity>({ storeName: 'maps', validationSchema: mapSchema });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(map =>
        map.title.toLowerCase().includes(query) ||
        (map.description && map.description.toLowerCase().includes(query))
      );
    }
    return result;
  });

  return {
    ...base,
    filtered,
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },
    setSearchQuery: (query: string) => { searchQuery.value = query; },
    searchQuery,
  };
});

// Direct file handler storage helpers (not Pinia)
const FILE_STORE = 'map_files';

export async function getMapFile(id: string): Promise<MapFile | undefined> {
  return idbGetItem<MapFile>(FILE_STORE, id);
}

export async function getAllMapFiles(): Promise<MapFile[]> {
  return idbGetAllItems<MapFile>(FILE_STORE);
}

export async function putMapFile(file: MapFile): Promise<void> {
  return idbPutItem<MapFile>(FILE_STORE, file);
}

export async function deleteMapFile(id: string): Promise<void> {
  return idbDeleteItem(FILE_STORE, id);
} 
