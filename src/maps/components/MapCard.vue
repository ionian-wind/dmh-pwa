<script setup lang="ts">
import { IconCurrentLocation } from '@tabler/icons-vue';
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/common/BaseCard.vue';
import type { MapEntity, MapLocation } from '../types';

const { t } = useI18n();

const props = defineProps<{
  map: MapEntity;
  linkedLocation?: MapLocation | null;
}>();

const emit = defineEmits<{
  (e: 'view', map: MapEntity): void;
  (e: 'edit', map: MapEntity): void;
  (e: 'delete', map: MapEntity): void;
  (e: 'copy', map: MapEntity): void;
  (e: 'open-location', locationId: string): void;
}>();

function handleView() {
  emit('view', props.map);
}
function handleEdit() {
  emit('edit', props.map);
}
function handleDelete() {
  emit('delete', props.map);
}
function handleCopy() {
  emit('copy', props.map);
}
</script>

<template>
  <BaseCard
    showView
    showEdit
    showDelete
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
    @copy="handleCopy"
  >
    <template #header>
      <h3>{{ map.title }}</h3>
    </template>
    <template v-if="linkedLocation" #actions>
      <QBtn
        flat
        color="warning"
        :title="t('maps.openLinkedLocation')"
        @click="emit('open-location', linkedLocation.id)"
      >
        <IconCurrentLocation />
      </QBtn>
    </template>
  </BaseCard>
</template>
