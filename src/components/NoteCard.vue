<script setup lang="ts">
import type { Note } from '@/types';
import BaseCard from './BaseCard.vue';

const props = defineProps<{ note: Note; moduleName?: string }>();
const emit = defineEmits(['edit', 'delete', 'view']);

function handleView() { emit('view', props.note); }
function handleEdit() { emit('edit', props.note); }
function handleDelete() { emit('delete', props.note); }
</script>
<template>
  <BaseCard showView showEdit showDelete @view="handleView" @edit="handleEdit" @delete="handleDelete">
    <template #header>
        <h3>{{ note.title }}</h3>
    </template>
    <div class="note-card-content">
      <p>{{ note.content }}</p>
    </div>
    <div class="note-card-footer">
      <span v-if="moduleName" class="module-badge">{{ moduleName }}</span>
      <div class="tags">
        <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>
  </BaseCard>
</template>
<style scoped>
.note-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.note-card-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.2rem;
}
.delete-btn {
  background: none;
  border: none;
  color: var(--color-text-light);
  font-size: 1.5rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  transition: color 0.2s;
}
.delete-btn:hover {
  color: var(--color-danger);
}
.note-card-content {
  color: var(--color-text);
  line-height: 1.5;
  flex: 1;
}
.note-card-content p {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.note-card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.module-badge {
  background: var(--color-background-soft);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  color: var(--color-text);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag {
  background: var(--color-background-soft);
  padding: 0.2em 0.7em;
  border-radius: var(--border-radius);
  font-size: 0.85em;
  color: var(--color-text-light);
}
</style> 