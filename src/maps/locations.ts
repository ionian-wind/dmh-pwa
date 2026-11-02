import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { MapLocation } from './types';
import { useStore } from '@/utils/storage';
import { useMapStore } from './maps';
import locationSchema from './schemas/mapLocation.schema.json';

export const useMapLocationStore = defineStore('map_locations', () => {
  const base = useStore<MapLocation>({
    storeName: 'map_locations',
    validationSchema: locationSchema,
  });
  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (location) =>
          location.name.toLowerCase().includes(query) ||
          (location.description &&
            location.description.toLowerCase().includes(query)),
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

export async function detachLocationFromMaps(locationId: string) {
  const mapStore = useMapStore();
  if (!mapStore.isLoaded) await mapStore.load();

  const affectedMaps = mapStore.items.filter((map) =>
    map.locationIds.includes(locationId),
  );

  await Promise.all(
    affectedMaps.map((map) =>
      mapStore.update(map.id, {
        locationIds: map.locationIds.filter((id) => id !== locationId),
        markers: map.markers.map((marker) => ({
          ...marker,
          locationId:
            marker.locationId === locationId ? null : marker.locationId,
        })),
      }),
    ),
  );
}

export async function deleteMapLocation(locationId: string) {
  const locationStore = useMapLocationStore();
  if (!locationStore.isLoaded) await locationStore.load();
  await detachLocationFromMaps(locationId);
  await locationStore.remove(locationId);
}
