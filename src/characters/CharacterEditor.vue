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
    <div class="q-pa-md q-gutter-md">
      <div class="q-mb-md">
        <div class="row q-col-gutter-md">
          <div class="col-12">
            <QInput
              :label="t('characters.fields.name')"
              dense
              outlined
              v-model="editedCharacter.name"
              type="text"
              required
            />
          </div>
        </div>
      </div>
      <div class="q-mb-md">
        <label>{{ t('common.notes') }}</label>
        <QScrollArea style="height: 300px; width: 100%">
          <QInput
            :type="'textarea'"
            v-model="editedCharacter.notes"
            :rows="5"
            autogrow
            borderless
            dense
            outlined
          />
        </QScrollArea>
      </div>
    </div>
  </BaseModal>
</template>
