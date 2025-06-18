<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { Module } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';

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
/* No need for .form-section, .form-grid, .form-group, label, input, select, textarea styles here; now in global.css */
</style> 
