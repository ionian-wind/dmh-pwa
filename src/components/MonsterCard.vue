<script setup lang="ts">
import { Monster } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';;

const props = defineProps<{
  monster: Monster;
  showActions?: boolean;
}>();

const emit = defineEmits(['view', 'edit', 'delete', 'add-to-encounter']);

const handleView = () => emit('view', props.monster);
const handleEdit = () => emit('edit', props.monster);
const handleDelete = () => emit('delete', props.monster.id);
</script>

<template>
  <BaseCard
    :show-view="showActions"
    :show-edit="showActions"
    :show-delete="showActions"
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
  >
    <template #header>
      <h3>{{ monster.name }}</h3>
    </template>
  </BaseCard>
</template>

