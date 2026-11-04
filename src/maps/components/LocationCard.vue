<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/common/BaseCard.vue';
import type { MapLocation } from '../types';

const props = defineProps<{
  location: MapLocation;
}>();

const emit = defineEmits<{
  (e: 'view', location: MapLocation): void;
  (e: 'edit', location: MapLocation): void;
  (e: 'delete', location: MapLocation): void;
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
    <p
      v-if="location.description"
      class="text-body2 text-grey-7 q-mt-none q-mb-sm"
    >
      {{ location.description }}
    </p>
  </BaseCard>
</template>
