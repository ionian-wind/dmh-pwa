<script setup lang="ts">
import { ref, watch } from 'vue';
import { useModuleStore } from '@/stores/modules';
import type { Party } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import { alert } from '@/dialogs';

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
  moduleIds: [],
});

watch(
  () => props.party,
  (newParty) => {
    if (newParty) {
      const { id, createdAt, updatedAt, ...partyData } = newParty;
      editedParty.value = { ...partyData };
    } else {
      editedParty.value = {
        name: '',
        description: '',
        notes: '',
        characters: [],
        moduleIds: [],
      };
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  if (!editedParty.value.name) {
    await alert('Name is required');
    return;
  }
  // Ensure moduleIds is always an array of strings
  editedParty.value.moduleIds = (editedParty.value.moduleIds || []).map((id: any) =>
    typeof id === 'string' ? id : id?.id || ''
  ).filter(Boolean);
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
            <QInput
              id="name"
              v-model="editedParty.name"
              type="text"
              required
              placeholder="Party name"
              dense
              outlined
            />
          </div>
          <div class="col-12 col-md-6">
            <label for="module">Module</label>
            <QSelect
              id="module"
              v-model="editedParty.moduleIds"
              :options="
                moduleStore.items.map((module) => ({
                  label: module.name,
                  value: module.id,
                }))
              "
              multiple
              use-chips
              dense
              outlined
              placeholder="Select modules"
            />
          </div>
        </div>
        <div class="q-mb-md">
          <label for="description">Description</label>
          <QInput
            id="description"
            v-model="editedParty.description"
            type="textarea"
            :rows="3"
            placeholder="Party description"
            dense
            outlined
          />
        </div>
      </div>
      <div class="q-mb-md">
        <h3>Notes</h3>
        <QInput
          v-model="editedParty.notes"
          type="textarea"
          :rows="3"
          placeholder="Additional notes about the party"
          dense
          outlined
        />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
/* Removed custom form-section, form-grid, form-group styles. Use Quasar classes. */
</style>
