<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconPencil, IconTrash } from '@tabler/icons-vue';
import EntityLinkList from './EntityLinkList.vue';
import type { MapArea } from '../types';
import { markerIconClass } from '../icons';

withDefaults(
  defineProps<{
    areas: MapArea[];
    showTitle?: boolean;
  }>(),
  {
    showTitle: true,
  },
);

const emit = defineEmits<{
  (e: 'select-area', areaId: string): void;
  (e: 'edit', area: MapArea): void;
  (e: 'delete', areaId: string): void;
  (e: 'hover', areaId: string | null): void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="map-areas-panel">
    <h4 v-if="showTitle" class="map-areas-title">{{ t('maps.areas') }}</h4>

    <p v-if="areas.length === 0" class="map-areas-empty">
      {{ t('maps.noAreas') }}
    </p>

    <div
      v-for="area in areas"
      :key="area.id"
      class="map-area-item"
      role="button"
      tabindex="0"
      :style="{ '--map-item-color': area.color || 'var(--color-primary)' }"
      @click="emit('select-area', area.id)"
      @keydown.enter="emit('select-area', area.id)"
      @mouseenter="emit('hover', area.id)"
      @mouseleave="emit('hover', null)"
    >
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
      <span class="map-area-actions">
        <button
          type="button"
          class="map-area-action"
          :title="t('common.edit')"
          :aria-label="t('common.edit')"
          @click.stop="emit('edit', area)"
        >
          <IconPencil :size="16" />
        </button>
        <button
          type="button"
          class="map-area-action map-area-action-danger"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          @click.stop="emit('delete', area.id)"
        >
          <IconTrash :size="16" />
        </button>
      </span>
    </div>
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
  position: relative;
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  width: 100%;
  padding: 0.6rem 0.6rem 0.6rem 0.9rem;
  overflow: hidden;
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  cursor: pointer;
}

.map-area-item::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--map-item-color, transparent);
  transition: width 0.2s;
}

.map-area-item:hover::before {
  width: 6px;
}

.map-area-item:hover {
  background: var(--color-background-soft);
}

.map-area-content {
  display: flex;
  flex: 1;
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

.map-area-description,
.map-area-links {
  color: var(--color-text-light);
  font-size: 0.85rem;
}

.map-area-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.2rem;
}

.map-area-action {
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

.map-area-action:hover {
  background: var(--color-background-mute);
  color: var(--color-text);
}

.map-area-action-danger:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
</style>
