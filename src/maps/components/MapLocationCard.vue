<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/common/BaseCard.vue';
import EntityLinkList from './EntityLinkList.vue';
import type { MapLocation } from '../types';

defineProps<{
  location: MapLocation;
  markerCount: number;
}>();

const emit = defineEmits<{
  (e: 'view', location: MapLocation): void;
  (e: 'edit', location: MapLocation): void;
  (e: 'delete', location: MapLocation): void;
}>();

const { t } = useI18n();
</script>

<template>
  <BaseCard
    showView
    showEdit
    showDelete
    :title="location.name || t('maps.untitledLocation')"
    class="map-location-card"
    @view="emit('view', location)"
    @edit="emit('edit', location)"
    @delete="emit('delete', location)"
  >
    <p v-if="location.description" class="map-location-description">
      {{ location.description }}
    </p>
    <EntityLinkList
      v-if="location.entities.length > 0"
      :links="location.entities"
    />
    <span class="map-location-markers">
      {{ t('maps.markerCount', { count: markerCount }) }}
    </span>
  </BaseCard>
</template>

<style scoped>
.map-location-description {
  margin: 0 0 0.75rem;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.map-location-markers {
  display: block;
  margin-top: 0.5rem;
  color: var(--color-text-light);
  font-size: 0.85rem;
}
</style>
