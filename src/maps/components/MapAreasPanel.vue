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
      class="map-area-item q-mx-sm q-mb-sm q-pa-sm bg-white rounded-borders"
      :style="{
        borderLeft: `4px solid ${area.color || 'var(--color-primary)'}`,
      }"
      @click="emit('select-area', area.id)"
      @keydown.enter="emit('select-area', area.id)"
      @mouseenter="emit('hover', area.id)"
      @mouseleave="emit('hover', null)"
    >
      <QItemSection>
        <div class="row items-center q-gutter-xs text-weight-bold">
          <i
            v-if="area.icon"
            :class="['ra', markerIconClass(area.icon)]"
            :style="{ color: area.color }"
            aria-hidden="true"
          ></i>
          <span>{{ area.title || t('maps.untitledArea') }}</span>
        </div>
        <div v-if="area.description" class="text-caption text-grey-7">
          {{ area.description }}
        </div>
        <EntityLinkList
          v-if="area.entities.length > 0"
          :links="area.entities"
        />
      </QItemSection>

      <QItemSection v-if="editable" side class="row items-center">
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
      </QItemSection>
    </QItem>
  </QList>
</template>
