import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { MapLocation } from './types';
import { useStore } from '@/utils/storage';
import { deleteMapFile } from './maps';
import { normalizeLocation } from './utils/normalize';
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

  async function load() {
    await base.load();
    base.items.value = base.items.value.map(normalizeLocation);
  }

  return {
    ...base,
    load,
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
  const locationStore = useMapLocationStore();
  if (!locationStore.isLoaded) await locationStore.load();

  const affectedLocations = locationStore.items.filter(
    (location) =>
      location.id !== locationId &&
      ((location.map?.markers ?? []).some(
        (marker) => marker.locationId === locationId,
      ) ||
        (location.map?.areas ?? []).some(
          (area) => area.locationId === locationId,
        )),
  );

  await Promise.all(
    affectedLocations.map((location) =>
      locationStore.update(location.id, {
        map: {
          ...location.map,
          markers: location.map.markers.map((marker) => ({
            ...marker,
            locationId:
              marker.locationId === locationId ? null : marker.locationId,
          })),
          areas: location.map.areas.map((area) => ({
            ...area,
            locationId: area.locationId === locationId ? null : area.locationId,
          })),
        },
      }),
    ),
  );
}

export async function deleteMapLocation(locationId: string) {
  const locationStore = useMapLocationStore();
  if (!locationStore.isLoaded) await locationStore.load();
  const location = locationStore.getById(locationId);
  await detachLocationFromMaps(locationId);
  await locationStore.remove(locationId);
  if (location?.map?.fileId) {
    await deleteMapFile(location.map.fileId).catch(() => undefined);
  }
}
