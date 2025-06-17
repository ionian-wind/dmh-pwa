<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useNoteTypeStore } from '@/stores/noteTypes';
import type { NoteTypeDefinition } from '@/types';

const props = defineProps<{
  modelValue: string | null;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void;
}>();

const noteTypeStore = useNoteTypeStore();
const showTypeEditor = ref(false);
const newType = ref<Omit<NoteTypeDefinition, 'id'>>({
  name: '',
  description: '',
  color: '#4a90e2',
  icon: undefined,
  fields: []
});

onMounted(async () => {
  await noteTypeStore.loadNoteTypes();
});

const addType = async () => {
  if (newType.value.name.trim()) {
    try {
      await noteTypeStore.addNoteType(newType.value);
      newType.value = {
        name: '',
        description: '',
        color: '#4a90e2',
        icon: undefined,
        fields: []
      };
      showTypeEditor.value = false;
    } catch (error) {
      console.error('Failed to add note type:', error);
    }
  }
};

const removeType = async (id: string) => {
  if (confirm('Are you sure you want to remove this note type?')) {
    try {
      await noteTypeStore.deleteNoteType(id);
    } catch (error) {
      console.error('Failed to remove note type:', error);
    }
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
        <option v-for="type in noteTypeStore.noteTypes" :key="type.id" :value="type.id">
          {{ type.name }}
        </option>
      </select>
      <button type="button" class="add-type-btn" @click="showTypeEditor = true">
        +
      </button>
    </div>

    <div v-if="showTypeEditor" class="type-editor">
      <div class="form-group">
        <label for="type-name">Name</label>
        <input
          id="type-name"
          v-model="newType.name"
          type="text"
          placeholder="Type name"
          @keydown.enter.prevent="addType"
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
        <button type="button" @click="addType">Add</button>
        <button type="button" @click="showTypeEditor = false">Cancel</button>
      </div>
    </div>

    <div v-if="noteTypeStore.noteTypes.length > 0" class="type-list">
      <div v-for="type in noteTypeStore.noteTypes" :key="type.id" class="type-item">
        <span v-if="type.icon" class="type-icon" :class="type.icon"></span>
        <span v-else class="type-color" :style="{ backgroundColor: type.color }"></span>
        <span class="type-name">{{ type.name }}</span>
        <button type="button" class="remove-type-btn" @click="removeType(type.id)">
          ×
        </button>
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

.add-type-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.add-type-btn:hover {
  background: var(--color-primary-dark);
}

.type-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-background-soft);
  border-radius: var(--border-radius);
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

.type-editor-actions button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.type-editor-actions button:first-child {
  background: var(--color-primary);
  color: white;
}

.type-editor-actions button:last-child {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.type-editor-actions button:hover {
  opacity: 0.9;
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
  width: 1rem;
  height: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.type-name {
  font-weight: 500;
}

.remove-type-btn {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;
}

.remove-type-btn:hover {
  color: var(--color-danger);
}
</style> 