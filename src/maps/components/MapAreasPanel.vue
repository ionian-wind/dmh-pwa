<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { IconPencil, IconTrash } from '@tabler/icons-vue';
import SidebarItem from '@/components/common/SidebarItem.vue';
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

    <SidebarItem
      v-for="area in areas"
      :key="area.id"
      :color="area.color"
      :title="area.title || t('maps.untitledArea')"
      class="map-area-item"
      @click="emit('select-area', area.id)"
      @keydown.enter="emit('select-area', area.id)"
      @mouseenter="emit('hover', area.id)"
      @mouseleave="emit('hover', null)"
    >
      <template #left>
        <i
          v-if="area.icon"
          :class="['ra', markerIconClass(area.icon)]"
          :style="{ color: area.color }"
          aria-hidden="true"
        ></i>
      </template>

      <div v-if="area.description" class="text-caption text-grey-7">
        {{ area.description }}
      </div>
      <template v-if="editable" #actions>
        <QBtn
          flat
          dense
          round
          size="sm"
          color="positive"
          class="map-area-action"
          :title="t('common.edit')"
          :aria-label="t('common.edit')"
          @click.stop="emit('edit', area)"
        >
          <IconPencil :size="16" />
        </QBtn>
        <QBtn
          flat
          dense
          round
          size="sm"
          color="negative"
          class="map-area-action map-area-action-danger"
          :title="t('common.delete')"
          :aria-label="t('common.delete')"
          @click.stop="emit('delete', area.id)"
        >
          <IconTrash :size="16" />
        </QBtn>
      </template>
    </SidebarItem>
  </QList>
</template>
