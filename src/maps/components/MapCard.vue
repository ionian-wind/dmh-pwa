<script setup lang="ts">
import BaseCard from '@/components/common/BaseCard.vue';
import type { MapEntity } from '../types';

const props = defineProps<{ 
  map: MapEntity 
}>();

const emit = defineEmits<{
  (e: 'view', map: MapEntity): void;
  (e: 'edit', map: MapEntity): void;
  (e: 'delete', map: MapEntity): void;
  (e: 'copy', map: MapEntity): void;
}>();

function handleView() { emit('view', props.map); }
function handleEdit() { emit('edit', props.map); }
function handleDelete() { emit('delete', props.map); }
function handleCopy() { emit('copy', props.map); }
</script>

<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete" @copy="handleCopy">
    <template #header>
      <h3>{{ map.title }}</h3>
    </template>
  </BaseCard>
</template>
