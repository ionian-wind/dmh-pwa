<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/common/BaseCard.vue';
import type { MapLocation } from '../types';

const props = defineProps<{
  location: MapLocation;
  linkedMapCount: number;
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
    class="location-card"
    @view="emit('view', props.location)"
    @edit="emit('edit', props.location)"
    @delete="emit('delete', props.location)"
  >
    <p v-if="location.description" class="location-description">
      {{ location.description }}
    </p>
    <span class="location-map-count">
      {{ t('maps.linkedMapCount', { count: linkedMapCount }) }}
    </span>
  </BaseCard>
</template>

<style scoped>
.location-description {
  margin: 0 0 0.75rem;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.location-map-count {
  display: block;
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
