<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Module } from '@/types';
import BaseModal from './BaseModal.vue';

const props = defineProps<{
  module: Module | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', module: Omit<Module, 'id'>): void;
  (e: 'cancel'): void;
}>();

const editedModule = ref<Omit<Module, 'id' | 'createdAt' | 'updatedAt'>>({
  name: '',
  description: '',
});

watch(() => props.module, (newModule) => {
  if (newModule) {
    const { id, createdAt, updatedAt, ...moduleData } = newModule;
    editedModule.value = moduleData;
  } else {
    editedModule.value = {
      name: '',
      description: '',
    };
  }
}, { immediate: true });

const handleSubmit = () => {
  if (!editedModule.value.name) {
    alert('Name is required');
    return;
  }
  emit('submit', {
    ...editedModule.value,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="module ? 'Edit Module' : 'Create Module'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save Module"
    cancelLabel="Cancel"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="form-section">
      <h3>Basic Information</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            v-model="editedModule.name"
            type="text"
            required
            placeholder="Module name"
          >
        </div>
      </div>
      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          v-model="editedModule.description"
          rows="3"
          placeholder="Module description"
        ></textarea>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.form-section {
  background: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: var(--border-radius);
}

.form-section h3 {
  margin: 0 0 1rem 0;
  color: var(--color-text);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--color-text);
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}
</style> 
