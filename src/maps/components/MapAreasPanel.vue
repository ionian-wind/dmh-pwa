<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconPencil, IconTrash } from '@tabler/icons-vue';
import type { MapArea } from '../types';
import { markerIconClass } from '@/utils/maps/icons';

withDefaults(
  defineProps<{
    areas: MapArea[];
    showTitle?: boolean;
    editable?: boolean;
    hideEmpty?: boolean;
  }>(),
  {
    showTitle: true,
    editable: true,
    hideEmpty: false,
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
  <QList class="q-py-sm">
    <div v-if="showTitle" class="text-subtitle2 q-px-sm q-py-xs">
      {{ t('maps.areas') }}
    </div>

    <div
      v-if="areas.length === 0 && !hideEmpty"
      class="text-caption text-grey-7 q-pa-sm"
    >
      {{ t('maps.noAreas') }}
    </div>

    <QItem
      v-for="area in areas"
      :key="area.id"
      clickable
      v-ripple
      class="map-area-item"
      :style="
        area.color ? { boxShadow: `inset 4px 0 0 ${area.color}` } : undefined
      "
      @click="emit('select-area', area.id)"
      @keydown.enter="emit('select-area', area.id)"
      @mouseenter="emit('hover', area.id)"
      @mouseleave="emit('hover', null)"
    >
      <QItemSection v-if="area.icon" side>
        <i
          :class="['ra', markerIconClass(area.icon)]"
          :style="{ color: area.color }"
          aria-hidden="true"
        ></i>
      </QItemSection>

      <QItemSection>
        <div class="map-item-title ellipsis">
          {{ area.title || t('maps.untitledArea') }}
        </div>
        <div v-if="area.description" class="text-caption text-grey-7 ellipsis">
          {{ area.description }}
        </div>
      </QItemSection>

      <QItemSection v-if="editable" side class="map-item-actions">
        <QBtn
          flat
          dense
          size="sm"
          color="positive"
          class="map-area-action"
          :title="t('common.edit')"
          :aria-label="t('common.edit')"
          @click.stop="emit('edit', area)"
        >
          <IconPencil :size="18" />
        </QBtn>
        <QBtn
          flat
          dense
          size="sm"
          color="negative"
          class="map-area-action map-area-action-danger"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          @click.stop="emit('delete', area.id)"
        >
          <IconTrash :size="18" />
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

.map-area-item:hover .map-item-actions,
.map-area-item:focus-within .map-item-actions {
  opacity: 1;
}
</style>
