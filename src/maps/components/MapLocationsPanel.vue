<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import EntityLinkList from './EntityLinkList.vue';
import type { MapLocation, MapMarker } from '../types';
import { markersForLocation } from '../utils/mapMarkers';

const props = defineProps<{
  locations: MapLocation[];
  markers: MapMarker[];
}>();

const emit = defineEmits<{
  (e: 'select-location', locationId: string): void;
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
    <h4 class="map-locations-title">{{ t('maps.locations') }}</h4>

    <p v-if="rows.length === 0" class="map-locations-empty">
      {{ t('maps.noLocations') }}
    </p>

    <button
      v-for="row in rows"
      :key="row.location.id"
      type="button"
      class="map-location-item"
      @click="emit('select-location', row.location.id)"
    >
      <span
        class="map-location-color"
        :style="{ background: row.location.color || 'var(--color-primary)' }"
      ></span>
      <span class="map-location-content">
        <span class="map-location-name">{{ row.location.name }}</span>
        <span v-if="row.location.description" class="map-location-description">
          {{ row.location.description }}
        </span>
        <EntityLinkList
          v-if="row.location.entities.length > 0"
          :links="row.location.entities"
        />
        <span class="map-location-markers">
          {{ t('maps.markerCount', { count: row.markers.length }) }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.map-locations-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.map-locations-title {
  margin: 0;
}

.map-locations-empty {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.map-location-item {
  display: flex;
  gap: 0.6rem;
  width: 100%;
  padding: 0.6rem;
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  cursor: pointer;
}

.map-location-item:hover {
  background: var(--color-background-soft);
}

.map-location-color {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  margin-top: 0.3rem;
  border-radius: 50%;
}

.map-location-content {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.map-location-name {
  font-weight: 600;
}

.map-location-description,
.map-location-markers {
  color: var(--color-text-light);
  font-size: 0.85rem;
}
</style>
