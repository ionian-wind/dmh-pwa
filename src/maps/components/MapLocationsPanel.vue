<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import MapLocationCard from './MapLocationCard.vue';
import type { MapLocation, MapMarker } from '../types';
import { markersForLocation } from '../utils/mapMarkers';

const props = withDefaults(
  defineProps<{
    locations: MapLocation[];
    markers: MapMarker[];
    showTitle?: boolean;
  }>(),
  {
    showTitle: true,
  },
);

const emit = defineEmits<{
  (e: 'select-location', locationId: string): void;
  (e: 'edit', location: MapLocation): void;
  (e: 'delete', location: MapLocation): void;
  (e: 'add'): void;
}>();

const { t } = useI18n();

const rows = computed(() =>
  props.locations.map((location) => ({
    location,
    markers: markersForLocation(props.markers, location.id),
  })),
);
</script>

<template>
  <div class="map-locations-panel">
    <div class="map-locations-header">
      <h4 v-if="showTitle" class="map-locations-title">
        {{ t('maps.locations') }}
      </h4>
      <QBtn
        color="primary"
        :label="t('maps.addLocation')"
        @click="emit('add')"
      />
    </div>

    <p v-if="rows.length === 0" class="map-locations-empty">
      {{ t('maps.noLocations') }}
    </p>

    <div v-else class="map-locations-grid">
      <MapLocationCard
        v-for="row in rows"
        :key="row.location.id"
        :location="row.location"
        :marker-count="row.markers.length"
        @view="emit('select-location', row.location.id)"
        @edit="emit('edit', row.location)"
        @delete="emit('delete', row.location)"
      />
    </div>
  </div>
</template>

<style scoped>
.map-locations-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.map-locations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.map-locations-title {
  margin: 0;
}

.map-locations-empty {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.map-locations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
</style>
