<script setup lang="ts">
import { ref, watch } from 'vue';
import { useModuleStore } from '@/stores/modules';
import type { Party, UUID } from '@/types';
import BaseModal from './BaseModal.vue';

const props = defineProps<{
  party: Party | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): void;
  (e: 'cancel'): void;
}>();

const moduleStore = useModuleStore();

type PartyForm = Omit<Party, 'id' | 'createdAt' | 'updatedAt'>;

const editedParty = ref<PartyForm>({
  name: '',
  description: '',
  notes: '',
  characters: [],
  moduleIds: []
});

watch(() => props.party, (newParty) => {
  if (newParty) {
    const { id, createdAt, updatedAt, ...partyData } = newParty;
    editedParty.value = { ...partyData };
  } else {
    editedParty.value = {
      name: '',
      description: '',
      notes: '',
      characters: [],
      moduleIds: []
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
  <BaseModal
    :isOpen="isOpen"
    :title="party ? 'Edit Party' : 'Create Party'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save Party"
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
            v-model="editedParty.name"
            type="text"
            required
            placeholder="Party name"
          >
        </div>
        <div class="form-group">
          <label for="module">Module</label>
          <select
            id="module"
            v-model="editedParty.moduleIds"
            multiple
          >
            <option v-for="module in moduleStore.modules" :key="module.id" :value="module.id">{{ module.name }}</option>
          </select>
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
