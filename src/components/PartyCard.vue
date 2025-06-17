<script setup lang="ts">
import type { Party } from '@/types';
import BaseCard from './BaseCard.vue';

const props = defineProps<{ party: Party }>();
const emit = defineEmits(['edit', 'delete', 'view']);

function handleView() { emit('view', props.party); }
function handleEdit() { emit('edit', props.party); }
function handleDelete() { emit('delete', props.party); }
</script>
<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete">
    <template #header>
      <h3>{{ party.name }}</h3>
    </template>
    <p class="description">{{ party.description }}</p>
  </BaseCard>
</template>
<style scoped>
.description {
  margin: 0 0 1rem 0;
  color: var(--color-text-light);
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 