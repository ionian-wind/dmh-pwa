<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconPencil, IconTrash } from '@tabler/icons-vue';
import EntityLinkList from './EntityLinkList.vue';
import type { MapMarker } from '../types';
import { markerIconClass } from '../icons';

defineProps<{
  markers: MapMarker[];
}>();

const emit = defineEmits<{
  (e: 'select-marker', markerId: string): void;
  (e: 'edit', marker: MapMarker): void;
  (e: 'delete', markerId: string): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="map-markers-panel">
    <p v-if="markers.length === 0" class="map-markers-empty">
      {{ t('maps.noMarkers') }}
    </p>

    <div
      v-for="marker in markers"
      :key="marker.id"
      class="map-marker-item"
      role="button"
      tabindex="0"
      @click="emit('select-marker', marker.id)"
      @keydown.enter="emit('select-marker', marker.id)"
    >
      <span
        class="map-marker-color"
        :style="{ background: marker.color || 'var(--color-primary)' }"
      ></span>
      <span class="map-marker-content">
        <span class="map-marker-name">
          <i
            v-if="marker.icon"
            :class="['ra', markerIconClass(marker.icon)]"
            :style="{ color: marker.color }"
            aria-hidden="true"
          ></i>
          {{ marker.title || t('maps.untitledMarker') }}
        </span>
        <span v-if="marker.description" class="map-marker-description">
          {{ marker.description }}
        </span>
        <EntityLinkList
          v-if="marker.entities.length > 0"
          :links="marker.entities"
        />
      </span>
      <span class="map-marker-actions">
        <button
          type="button"
          class="map-marker-action"
          :title="t('common.edit')"
          :aria-label="t('common.edit')"
          @click.stop="emit('edit', marker)"
        >
          <IconPencil :size="16" />
        </button>
        <button
          type="button"
          class="map-marker-action map-marker-action-danger"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          @click.stop="emit('delete', marker.id)"
        >
          <IconTrash :size="16" />
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.map-markers-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.map-markers-empty {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.map-marker-item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  width: 100%;
  padding: 0.6rem;
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  cursor: pointer;
}

.map-marker-item:hover {
  background: var(--color-background-soft);
}

.map-marker-color {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  margin-top: 0.35rem;
  border-radius: 50%;
}

.map-marker-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.map-marker-name {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
}

.map-marker-description {
  color: var(--color-text-light);
  font-size: 0.85rem;
}

.map-marker-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.2rem;
}

.map-marker-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-light);
  cursor: pointer;
}

.map-marker-action:hover {
  background: var(--color-background-mute);
  color: var(--color-text);
}

.map-marker-action-danger:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
</style>
