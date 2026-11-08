<script setup lang="ts">
import { Pawn } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';

const props = defineProps<{
  pawn: Pawn;
  showActions?: boolean;
}>();

const emit = defineEmits([
  'view',
  'edit',
  'delete',
  'add-to-encounter',
  'copy',
]);

const handleView = () => emit('view', props.pawn);
const handleEdit = () => emit('edit', props.pawn);
const handleDelete = () => emit('delete', props.pawn.id);
const handleCopy = () => emit('copy', props.pawn);
</script>

<template>
  <BaseCard
    :show-view="showActions"
    :show-edit="showActions"
    :show-delete="showActions"
    :show-copy="showActions"
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
    @copy="handleCopy"
    :title="pawn.name"
    :drag-entity="{ kind: 'pawn', id: pawn.id, title: pawn.name }"
  />
</template>
