<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PlayerCharacter, UUID } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/form/Button.vue';
import { useI18n } from 'vue-i18n';

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

const { t } = useI18n();

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
    alert(t('characterEditor.nameRequired'));
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
    <div class="q-pa-md q-gutter-md">
      <div class="q-mb-md">
        <h3>Basic Information</h3>
        <div class="row q-col-gutter-md">
          <div class="col-12">
            <label>Name</label>
            <input v-model="editedCharacter.name" type="text" required class="q-input" />
          </div>
        </div>
      </div>
      <div class="q-mb-md">
        <label>Notes</label>
        <textarea v-model="editedCharacter.notes" rows="3" class="q-input" />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
/* Removed custom form-section, form-grid, form-group styles. Use Quasar classes. */
</style> 
