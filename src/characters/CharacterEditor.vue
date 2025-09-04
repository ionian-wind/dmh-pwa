<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PlayerCharacter, UUID } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import { useI18n } from 'vue-i18n';
import { alert } from '@/dialogs';

const props = withDefaults(
  defineProps<{
    character?: PlayerCharacter | null;
    isOpen: boolean;
    partyId?: UUID;
  }>(),
  {
    character: null,
  },
);

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

const editedCharacter = ref<PlayerCharacter>(
  props.character ? { ...props.character } : blankCharacter(),
);
const isEditing = computed(() => !!(props.character && props.character.id));

watch(
  () => props.character,
  (newChar) => {
    editedCharacter.value = newChar ? { ...newChar } : blankCharacter();
  },
);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) resetForm();
  },
);

function resetForm() {
  editedCharacter.value = blankCharacter();
}

async function handleSubmit() {
  if (!editedCharacter.value.name) {
    await alert(t('characterEditor.nameRequired'));
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
    :title="isEditing ? t('characters.edit') : t('characters.create')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="character-editor"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            :label="t('characters.fields.name')"
            id="encounter-name"
            v-model="editedCharacter.name"
            type="text"
            required
            outlined
          />
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            :label="t('common.notes')"
            id="character-description"
            v-model="editedCharacter.notes"
            type="textarea"
            :rows="5"
            autogrow
            outlined
          />
        </div>
      </div>
    </div>
  </BaseModal>
</template>
