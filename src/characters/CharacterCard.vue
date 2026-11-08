<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerCharacter } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';
import EntityPicture from '@/components/common/EntityPicture.vue';
import { plainTextPreview } from '@/utils/plainTextPreview';

const props = defineProps<{
  character: PlayerCharacter;
}>();

const description = computed(() => plainTextPreview(props.character.notes, 90));

const emit = defineEmits<{
  (e: 'view', character: PlayerCharacter): void;
  (e: 'edit', character: PlayerCharacter): void;
  (e: 'delete', character: PlayerCharacter): void;
  (e: 'copy', character: PlayerCharacter): void;
}>();

function handleView() {
  emit('view', props.character);
}
function handleEdit() {
  emit('edit', props.character);
}
function handleDelete() {
  emit('delete', props.character);
}
function handleCopy() {
  emit('copy', props.character);
}
</script>

<template>
  <BaseCard
    showView
    showEdit
    showDelete
    showCopy
    @view="handleView"
    @edit="handleEdit"
    @delete="handleDelete"
    @copy="handleCopy"
    :title="character.name"
    :drag-entity="{
      kind: 'character',
      id: character.id,
      title: character.name,
    }"
  >
    <template #media>
      <EntityPicture
        :picture="character.picture"
        size="56px"
        :alt="character.name"
      />
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
