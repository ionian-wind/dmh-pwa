<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import EntityLinkList from './EntityLinkList.vue';
import type { MapArea } from '../types';
import { markerIconClass } from '../icons';

defineProps<{
  areas: MapArea[];
}>();

const emit = defineEmits<{
  (e: 'select-area', areaId: string): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="map-areas-panel">
    <h4 class="map-areas-title">{{ t('maps.areas') }}</h4>

    <p v-if="areas.length === 0" class="map-areas-empty">
      {{ t('maps.noAreas') }}
    </p>

    <button
      v-for="area in areas"
      :key="area.id"
      type="button"
      class="map-area-item"
      @click="emit('select-area', area.id)"
    >
      <span
        class="map-area-color"
        :style="{ background: area.color || 'var(--color-primary)' }"
      ></span>
      <span class="map-area-content">
        <span class="map-area-name">
          <i
            v-if="area.icon"
            :class="['ra', markerIconClass(area.icon)]"
            :style="{ color: area.color }"
            aria-hidden="true"
          ></i>
          {{ area.title || t('maps.untitledArea') }}
        </span>
        <span class="map-area-shape">
          {{ t(`maps.shapes.${area.shape}`) }}
        </span>
        <span v-if="area.description" class="map-area-description">
          {{ area.description }}
        </span>
        <EntityLinkList
          v-if="area.entities.length > 0"
          :links="area.entities"
        />
        <span v-if="area.linkedAreaIds.length > 0" class="map-area-links">
          {{ t('maps.linkedAreaCount', { count: area.linkedAreaIds.length }) }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.map-areas-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.map-areas-title {
  margin: 0;
}

.map-areas-empty {
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.map-area-item {
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

.map-area-item:hover {
  background: var(--color-background-soft);
}

.map-area-color {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  margin-top: 0.3rem;
  border-radius: 50%;
}

.map-area-content {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.map-area-name {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
}

.map-area-shape,
.map-area-description,
.map-area-links {
  color: var(--color-text-light);
  font-size: 0.85rem;
}
</style>
