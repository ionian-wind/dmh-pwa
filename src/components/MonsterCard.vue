<script setup lang="ts">
import { computed } from 'vue';
import { useModuleStore } from '@/stores/modules';
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
      <div class="monster-header">
        <h3>{{ monster.name }}</h3>
      </div>
    </template>
  </BaseCard>
</template>

<style scoped>
.monster-header {
  margin-bottom: 0.5rem;
}
.monster-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}
</style>
