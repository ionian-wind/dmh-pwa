<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconPencil, IconTrash } from '@tabler/icons-vue';
import SidebarItem from '@/components/common/SidebarItem.vue';
import type { MapMarker } from '../types';
import { markerIconClass } from '../icons';

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

    <SidebarItem
      v-for="marker in markers"
      :key="marker.id"
      :color="marker.color"
      :title="marker.title || t('maps.untitledMarker')"
      class="map-marker-item"
      @click="emit('select-marker', marker.id)"
      @keydown.enter="emit('select-marker', marker.id)"
      @mouseenter="emit('hover', marker.id)"
      @mouseleave="emit('hover', null)"
    >
      <template #left>
        <i
          v-if="marker.icon"
          :class="['ra', markerIconClass(marker.icon)]"
          :style="{ color: marker.color }"
          aria-hidden="true"
        ></i>
      </template>

      <div v-if="marker.description" class="text-caption text-grey-7">
        {{ marker.description }}
      </div>
      <template v-if="editable" #actions>
        <QBtn
          flat
          dense
          round
          size="sm"
          color="positive"
          class="map-marker-action"
          :title="t('common.edit')"
          :aria-label="t('common.edit')"
          @click.stop="emit('edit', marker)"
        >
          <IconPencil :size="16" />
        </QBtn>
        <QBtn
          flat
          dense
          round
          size="sm"
          color="negative"
          class="map-marker-action map-marker-action-danger"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          @click.stop="emit('delete', marker.id)"
        >
          <IconTrash :size="16" />
        </QBtn>
      </template>
    </SidebarItem>
  </QList>
</template>
