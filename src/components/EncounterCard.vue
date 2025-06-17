<script setup lang="ts">
import type { Encounter } from '@/types';
import BaseCard from './BaseCard.vue';

const props = defineProps<{ encounter: Encounter }>();
const emit = defineEmits(['view', 'edit', 'delete']);

function handleView() { emit('view', props.encounter); }
function handleEdit() { emit('edit', props.encounter); }
function handleDelete() { emit('delete', props.encounter); }
</script>
<template>
  <BaseCard showEdit showDelete showView @view="handleView" @edit="handleEdit" @delete="handleDelete">
    <template #header>
      <h3>{{ encounter.name }}</h3>
    </template>
    <div class="encounter-meta">
      <span class="meta-item"><span class="label">Level:</span> <span class="value">{{ encounter.level }}</span></span>
      <span class="meta-item"><span class="label">Difficulty:</span> <span class="value">{{ encounter.difficulty }}</span></span>
      <span class="meta-item"><span class="label">XP:</span> <span class="value">{{ encounter.xp }}</span></span>
      <span class="meta-item"><span class="label">Module:</span> <span class="value">{{ encounter.moduleId }}</span></span>
    </div>
    <p v-if="encounter.description" class="description">{{ encounter.description }}</p>
    <div class="monsters-summary">
      <span class="label">Monsters:</span>
      <span class="value">{{ encounter.monsters?.length }}</span>
    </div>
  </BaseCard>
</template>
<style scoped>
.encounter-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.label {
  color: var(--color-text-light);
  font-size: 0.9rem;
}
.value {
  color: var(--color-text);
  font-weight: 500;
}
.description {
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.monsters-summary {
  margin-top: 0.5rem;
}
</style> 