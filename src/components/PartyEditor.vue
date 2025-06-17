<script setup lang="ts">
import { ref, watch } from 'vue';
import { useModuleStore } from '@/stores/modules';
import type { Party } from '@/types';
import ModuleSelector from './ModuleSelector.vue';

const props = defineProps<{
  party: Party | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', party: Party): void;
  (e: 'cancel'): void;
}>();

const moduleStore = useModuleStore();

const editedParty = ref<Party>({
  name: '',
  description: '',
  size: 4,
  notes: '',
  moduleId: null
});

watch(() => props.party, (newParty) => {
  if (newParty) {
    editedParty.value = { ...newParty };
  } else {
    editedParty.value = {
      name: '',
      description: '',
      level: 1,
      size: 4,
      notes: '',
      moduleId: null
    };
  }
}, { immediate: true });

const handleSubmit = () => {
  if (!editedParty.value.name) {
    alert('Name is required');
    return;
  }
  emit('submit', editedParty.value);
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <div v-if="isOpen" class="party-editor">
    <div class="editor-content">
      <div class="editor-header">
        <h2>{{ party ? 'Edit Party' : 'Create Party' }}</h2>
      </div>

      <form @submit.prevent="handleSubmit" class="editor-form">
        <div class="form-section">
          <h3>Basic Information</h3>
          <div class="form-grid">
            <div class="form-group">
              <label for="name">Name</label>
              <input
                id="name"
                v-model="editedParty.name"
                type="text"
                required
                placeholder="Party name"
              >
            </div>

            <div class="form-group">
              <label for="module">Module</label>
              <ModuleSelector
                v-model="editedParty.moduleId"
                placeholder="No Module"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="editedParty.description"
              rows="3"
              placeholder="Party description"
            ></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>Notes</h3>
          <div class="form-group">
            <textarea
              v-model="editedParty.notes"
              rows="3"
              placeholder="Additional notes about the party"
            ></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="submit-btn">
            {{ party ? 'Save Changes' : 'Create Party' }}
          </button>
          <button type="button" class="cancel-btn" @click="handleCancel">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.party-editor {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.editor-content {
  background: var(--color-background);
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.editor-header {
  margin-bottom: 2rem;
}

.editor-header h2 {
  margin: 0;
  color: var(--color-text);
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

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

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.submit-btn,
.cancel-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.submit-btn {
  background: var(--color-primary);
  color: white;
}

.cancel-btn {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.submit-btn:hover {
  background: var(--color-primary-dark);
}

.cancel-btn:hover {
  background: var(--color-background-mute);
}
</style> 
