<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { MapMarker } from '../types';
import { markerIconClass } from '@/utils/maps/icons';

withDefaults(
  defineProps<{
    markers: MapMarker[];
    editable?: boolean;
    hideEmpty?: boolean;
  }>(),
  {
    editable: true,
    hideEmpty: false,
  },
);

const emit = defineEmits<{
  (e: 'select-marker', markerId: string): void;
  (e: 'edit', marker: MapMarker): void;
  (e: 'delete', markerId: string): void;
  (e: 'hover', markerId: string | null): void;
}>();

const { t } = useI18n();
</script>

<template>
  <QList class="q-py-sm">
    <div
      v-if="markers.length === 0 && !hideEmpty"
      class="text-caption text-grey-7 q-pa-sm"
    >
      {{ t('maps.noMarkers') }}
    </div>

    <QItem
      v-for="marker in markers"
      :key="marker.id"
      clickable
      v-ripple
      class="map-marker-item"
      :style="
        marker.color
          ? { boxShadow: `inset 4px 0 0 ${marker.color}` }
          : undefined
      "
      @click="emit('select-marker', marker.id)"
      @keydown.enter="emit('select-marker', marker.id)"
      @mouseenter="emit('hover', marker.id)"
      @mouseleave="emit('hover', null)"
    >
      <QItemSection v-if="marker.icon" side>
        <i
          :class="['ra', markerIconClass(marker.icon)]"
          :style="{ color: marker.color }"
          aria-hidden="true"
        ></i>
      </QItemSection>

      <QItemSection>
        <div class="map-item-title ellipsis">
          {{ marker.title || t('maps.untitledMarker') }}
        </div>
        <div
          v-if="marker.description"
          class="text-caption text-grey-7 ellipsis"
        >
          {{ marker.description }}
        </div>
      </QItemSection>

      <QItemSection v-if="editable" side class="map-item-actions">
        <QBtn
          flat
          dense
          size="sm"
          color="positive"
          class="map-marker-action"
          :title="t('common.edit')"
          :aria-label="t('common.edit')"
          @click.stop="emit('edit', marker)"
        >
          <QIcon name="tabler-pencil" size="18px" />
        </QBtn>
        <QBtn
          flat
          dense
          size="sm"
          color="negative"
          class="map-marker-action map-marker-action-danger"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          @click.stop="emit('delete', marker.id)"
        >
          <QIcon name="tabler-trash" size="18px" />
        </QBtn>
      </QItemSection>
    </QItem>
  </QList>
</template>

<style scoped>
.map-item-title {
  font-weight: 500;
}

.map-item-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.map-marker-item:hover .map-item-actions,
.map-marker-item:focus-within .map-item-actions {
  opacity: 1;
}
</style>
