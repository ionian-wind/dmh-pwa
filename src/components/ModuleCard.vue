<script setup lang="ts">
import type { Module } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import { defineProps, defineEmits } from 'vue';

const props = defineProps<{ module: Module }>();
const emit = defineEmits(['edit', 'delete', 'view', 'copy']);

const handleView = () => emit('view', props.module);
const handleEdit = () => emit('edit', props.module);
const handleDelete = () => emit('delete', props.module);
const handleCopy = () => emit('copy', props.module);
</script>

<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete" @copy="handleCopy">
    <template #header>
      <h3>{{ module.name }}</h3>
    </template>
    <div class="description" v-if="module.description">
      <p>{{ module.description }}</p>
    </div>
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
