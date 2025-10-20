<script setup lang="ts">
import type { SheetDefinition } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';

const props = defineProps<{
  sheet: SheetDefinition;
}>();

const emit = defineEmits<{
  (e: 'view', sheet: SheetDefinition): void;
  (e: 'edit', sheet: SheetDefinition): void;
  (e: 'delete', sheet: SheetDefinition): void;
  (e: 'copy', sheet: SheetDefinition): void;
}>();

function handleView() {
  emit('view', props.sheet);
}
function handleEdit() {
  emit('edit', props.sheet);
}
function handleDelete() {
  emit('delete', props.sheet);
}
function handleCopy() {
  emit('copy', props.sheet);
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
    :title="sheet.name"
  >
    <template #header>
      <div v-if="sheet.system" class="text-caption text-italic">
        System: {{ sheet.system }}
      </div>
      <div v-if="sheet.description" class="text-caption">
        {{ sheet.description }}
      </div>
    </template>
  </BaseCard>
</template>