<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PlayerCharacter, UUID } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';

const props = withDefaults(defineProps<{
  character?: PlayerCharacter | null;
  isOpen: boolean;
  partyId?: UUID;
}>(), {
  character: null
});

const emit = defineEmits<{
  (e: 'submit', character: PlayerCharacter): void;
  (e: 'cancel'): void;
}>();

const blankCharacter = (): PlayerCharacter => ({
  id: '',
  name: '',
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const editedCharacter = ref<PlayerCharacter>(props.character ? { ...props.character } : blankCharacter());
const isEditing = computed(() => !!(props.character && props.character.id));

watch(() => props.character, (newChar) => {
  editedCharacter.value = newChar ? { ...newChar } : blankCharacter();
});

watch(() => props.isOpen, (open) => {
  if (!open) resetForm();
});

function resetForm() {
  editedCharacter.value = blankCharacter();
}

function handleSubmit() {
  if (!editedCharacter.value.name) {
    alert('Name is required');
    return;
  }
  emit('submit', { ...editedCharacter.value });
  resetForm();
}

function handleCancel() {
  resetForm();
  emit('cancel');
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isEditing ? 'Edit Character' : 'Create Character'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save Character"
    cancelLabel="Cancel"
    modalId="character-editor"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="form-section">
      <h3>Basic Information</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Name</label>
          <input v-model="editedCharacter.name" type="text" required />
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-group">
        <label>Notes</label>
        <textarea v-model="editedCharacter.notes" rows="3" />
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
