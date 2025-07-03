<script setup lang="ts">
import { computed } from 'vue';
import type { PlayerCharacter } from '@/types';
import BaseCard from '@/components/common/BaseCard.vue';;
import Button from '@/components/form/Button.vue';

const props = defineProps<{
  character: PlayerCharacter;
}>();

const emit = defineEmits<{
  (e: 'view', character: PlayerCharacter): void;
  (e: 'edit', character: PlayerCharacter): void;
  (e: 'delete', character: PlayerCharacter): void;
  (e: 'copy', character: PlayerCharacter): void;
}>();

function handleView() { emit('view', props.character); }
function handleEdit() { emit('edit', props.character); }
function handleDelete() { emit('delete', props.character); }
function handleCopy() { emit('copy', props.character); }
</script>

<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete" @copy="handleCopy">
    <template #header>
      <div class="character-header">
        <h3>{{ character.name }}</h3>
      </div>
    </template>
  </BaseCard>
</template>

<style scoped>
.character-header {
  margin-bottom: 0.5rem;
}
.character-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}
.character-card-actions {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}
</style>
