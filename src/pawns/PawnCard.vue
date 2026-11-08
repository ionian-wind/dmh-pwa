<script setup lang="ts">
import { computed } from 'vue';
import { Pawn } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import EntityPicture from '@/components/common/EntityPicture.vue';
import { plainTextPreview } from '@/utils/plainTextPreview';

const props = defineProps<{
  pawn: Pawn;
  showActions?: boolean;
}>();

const description = computed(() => plainTextPreview(props.pawn.notes, 90));

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
  >
    <template #media>
      <EntityPicture :picture="pawn.picture" size="56px" :alt="pawn.name" />
    </template>
    <template #header>
      <p v-if="description" class="entity-card-description">
        {{ description }}
      </p>
    </template>
  </BaseCard>
</template>

<style scoped>
.entity-card-description {
  margin: 4px 0 0;
  color: var(--color-text-light);
  font-size: 0.85rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
