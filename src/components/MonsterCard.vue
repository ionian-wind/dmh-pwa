<script setup lang="ts">
import { Monster } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import { defineProps } from 'vue';

const props = defineProps<{
  monster: Monster;
  showActions?: boolean;
}>();

const emit = defineEmits(['view', 'edit', 'delete', 'add-to-encounter', 'copy']);

const handleView = () => emit('view', props.monster);
const handleEdit = () => emit('edit', props.monster);
const handleDelete = () => emit('delete', props.monster.id);
const handleCopy = () => emit('copy', props.monster);
</script>

<template>
  <BaseCard
    :show-view="showActions"
    :show-edit="showActions"
    :show-delete="showActions"
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
    @copy="handleCopy"
  >
    <template #header>
      <h3>{{ monster.name }}</h3>
    </template>
  </BaseCard>
</template>

