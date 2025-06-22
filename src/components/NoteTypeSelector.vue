<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useNoteTypeStore } from '@/stores/noteTypes';
import type { NoteType } from '@/types';
import Button from '@/components/common/Button.vue';
import PopoverPanel from '@/components/common/PopoverPanel.vue';

const props = defineProps<{
  modelValue: string | null;
  placeholder?: string;
  allowCreate?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const noteTypeStore = useNoteTypeStore();
const showTypeEditor = ref(false);
const newType = ref<Partial<NoteType>>({
  name: '',
  description: '',
  color: '#4a90e2',
  icon: undefined,
  fields: []
});
const createButtonRef = ref<HTMLElement | null>(null);

onMounted(async () => {
  await noteTypeStore.load();
});

const handleCreateType = async () => {
  if (newType.value.name?.trim()) {
    await noteTypeStore.create(newType.value as Omit<NoteType, 'id'>);
    newType.value.name = '';
    showTypeEditor.value = false;
  }
};

const handleDeleteType = async (id: string) => {
  if (confirm('Are you sure you want to delete this note type?')) {
    await noteTypeStore.remove(id);
  }
};
</script>

<template>
  <div class="note-type-selector">
    <div class="type-select">
      <select
        :value="modelValue"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value || null)"
      >
        <option value="" disabled>{{ placeholder || 'Select note type' }}</option>
        <option v-for="type in noteTypeStore.items" :key="type.id" :value="type.id">
          {{ type.name }}
        </option>
      </select>
      <Button v-if="allowCreate" ref="createButtonRef" size="small" variant="light" @click="showTypeEditor = true">+</Button>
    </div>

    <PopoverPanel
      :is-open="showTypeEditor"
      :trigger-el="createButtonRef"
      @close="showTypeEditor = false"
      placement="bottom-end"
      :trap-focus="true"
    >
      <div class="type-editor">
        <h3>Create New Type</h3>
        <div class="form-group">
          <label for="type-name">Name</label>
          <input
            id="type-name"
            v-model="newType.name"
            type="text"
            placeholder="Type name"
            @keydown.enter.prevent="handleCreateType"
          >
        </div>
        <div class="form-group">
          <label for="type-description">Description</label>
          <input
            id="type-description"
            v-model="newType.description"
            type="text"
            placeholder="Type description (optional)"
          >
        </div>
        <div class="form-group">
          <label for="type-color">Color</label>
          <input
            id="type-color"
            v-model="newType.color"
            type="color"
          >
        </div>
        <div class="form-group">
          <label for="type-icon">Icon (optional)</label>
          <input
            id="type-icon"
            v-model="newType.icon"
            type="text"
            placeholder="Icon name or class"
          >
        </div>
        <div class="type-editor-actions">
          <Button size="small" @click="handleCreateType">Add</Button>
          <Button size="small" variant="secondary" @click="showTypeEditor = false">Cancel</Button>
        </div>
      </div>
    </PopoverPanel>

    <div v-if="noteTypeStore.items.length > 0" class="type-list">
      <div v-for="type in noteTypeStore.items" :key="type.id" class="type-item">
        <span v-if="type.icon" class="type-icon" :class="type.icon"></span>
        <span v-else class="type-color" :style="{ backgroundColor: type.color }"></span>
        <span class="type-name">{{ type.name }}</span>
        <Button size="small" variant="danger" class="remove-type-btn" @click="handleDeleteType(type.id)">×</Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-type-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-select {
  display: flex;
  gap: 0.5rem;
}

.type-select select {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.type-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  min-width: 250px;
}

.type-editor h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.9rem;
  color: var(--color-text);
}

.form-group input {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.form-group input[type="color"] {
  padding: 0.25rem;
  width: 100%;
  height: 2.5rem;
}

.type-editor-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.type-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  color: var(--color-text);
}

.type-color {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
}

.type-icon {
  font-size: 1rem;
}

.remove-type-btn {
  padding: 0.1em 0.4em;
  font-size: 1.1em;
  line-height: 1;
}
</style> 