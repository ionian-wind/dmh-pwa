<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useModuleStore } from '@/stores/modules';
import type { Party, UUID } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';

const moduleStore = useModuleStore();

const props = defineProps<{
  party: Party | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): void;
  (e: 'cancel'): void;
}>();

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
    modalId="party-editor-modal"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="q-pa-md q-gutter-md">
      <div class="q-mb-md">
        <h3>Basic Information</h3>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <label for="name">Name</label>
            <input id="name" v-model="editedParty.name" type="text" required placeholder="Party name" class="q-input" />
          </div>
          <div class="col-12 col-md-6">
            <label for="module">Module</label>
            <select id="module" v-model="editedParty.moduleIds" multiple class="q-input">
              <option v-for="module in moduleStore.items" :key="module.id" :value="module.id">{{ module.name }}</option>
            </select>
          </div>
        </div>
        <div class="q-mb-md">
          <label for="description">Description</label>
          <textarea id="description" v-model="editedParty.description" rows="3" placeholder="Party description" class="q-input" />
        </div>
      </div>
      <div class="q-mb-md">
        <h3>Notes</h3>
        <textarea v-model="editedParty.notes" rows="3" placeholder="Additional notes about the party" class="q-input" />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
/* Removed custom form-section, form-grid, form-group styles. Use Quasar classes. */
</style> 
