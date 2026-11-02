<script setup lang="ts">
import { IconMapPin2 } from '@tabler/icons-vue';
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/common/BaseCard.vue';
import type { MapEntity, MapLocation } from '../types';

const props = defineProps<{
  location: MapLocation;
  linkedMap?: MapEntity | null;
}>();

const emit = defineEmits<{
  (e: 'view', location: MapLocation): void;
  (e: 'edit', location: MapLocation): void;
  (e: 'delete', location: MapLocation): void;
  (e: 'open-map', mapId: string): void;
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
    <span v-if="linkedMap" class="location-map-name">
      {{ linkedMap.title }}
    </span>
    <template v-if="linkedMap" #actions>
      <QBtn
        flat
        color="warning"
        :title="t('maps.openLinkedMap')"
        @click="emit('open-map', linkedMap.id)"
      >
        <IconMapPin2 />
      </QBtn>
    </template>
  </BaseCard>
</template>

<style scoped>
.location-description {
  margin: 0 0 0.75rem;
  color: var(--color-text-light);
  font-size: 0.9rem;
}

.location-map-name {
  display: block;
  color: var(--color-primary);
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
