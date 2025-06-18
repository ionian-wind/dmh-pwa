<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useModuleStore } from '@/stores/modules';
import type { Party, UUID } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';

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
  moduleIds: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? [moduleStore.currentModuleFilter] : []
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
      moduleIds: (moduleStore.currentModuleFilter !== 'any' && moduleStore.currentModuleFilter !== 'none' && moduleStore.currentModuleFilter) ? [moduleStore.currentModuleFilter] : []
    };
  }
}, { immediate: true });

watch(() => moduleStore.currentModuleFilter, (newFilter) => {
  if (!props.party && props.isOpen) {
    editedParty.value.moduleIds = (newFilter !== 'any' && newFilter !== 'none' && newFilter) ? [newFilter] : [];
  }
});

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
/* No need for .form-section, .form-grid, .form-group, label, input, select, textarea styles here; now in global.css */
</style> 
