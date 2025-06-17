<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useNoteTypeStore } from '@/stores/noteTypes';
import type { NoteType } from '@/types';
import Button from '@/components/common/Button.vue';

const props = defineProps<{
  modelValue: string | null;
  placeholder?: string;
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

onMounted(async () => {
  await noteTypeStore.loadNoteTypes();
});

const addType = async () => {
  if (newType.value.name?.trim()) {
    try {
      await noteTypeStore.addNoteType(newType.value as Omit<NoteType, 'id'>);
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
      <Button size="small" class="add-type-btn" @click="showTypeEditor = true">+</Button>
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
        <Button size="small" @click="addType">Add</Button>
        <Button size="small" variant="secondary" @click="showTypeEditor = false">Cancel</Button>
      </div>
    </div>

    <div v-if="noteTypeStore.noteTypes.length > 0" class="type-list">
      <div v-for="type in noteTypeStore.noteTypes" :key="type.id" class="type-item">
        <span v-if="type.icon" class="type-icon" :class="type.icon"></span>
        <span v-else class="type-color" :style="{ backgroundColor: type.color }"></span>
        <span class="type-name">{{ type.name }}</span>
        <Button size="small" variant="danger" class="remove-type-btn" @click="removeType(type.id)">×</Button>
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
</style> 