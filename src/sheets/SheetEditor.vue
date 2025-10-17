<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Sheet } from '@/sheets/types/sheet.types';
import BaseModal from '@/components/common/BaseModal.vue';
import { useI18n } from 'vue-i18n';
import { alert } from '@/dialogs';

const props = withDefaults(
  defineProps<{
    sheet?: Sheet | null;
    isOpen: boolean;
  }>(),
  {
    sheet: null,
  },
);

const emit = defineEmits<{
  (e: 'submit', sheet: Sheet): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();

const blankSheet = (): Sheet => ({
  id: '',
  name: '',
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  layout: [],
  gameSystem: 'dnd5e',
});

const editedSheet = ref<Sheet>(props.sheet ? { ...props.sheet } : blankSheet());
const isEditing = computed(() => !!(props.sheet && props.sheet.id));

watch(
  () => props.sheet,
  (newSheet) => {
    editedSheet.value = newSheet ? { ...newSheet } : blankSheet();
  },
);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) resetForm();
  },
);

function resetForm() {
  editedSheet.value = blankSheet();
}

async function handleSubmit() {
  if (!editedSheet.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }
  emit('submit', { ...editedSheet.value, updatedAt: Date.now() });
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
    :title="isEditing ? t('sheets.edit') : t('sheets.create')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="sheet-editor"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            :label="t('sheets.fields.name')"
            id="sheet-name"
            v-model="editedSheet.name"
            type="text"
            required
            outlined
          />
        </div>

        <div class="form-group">
          <QSelect
            :label="t('sheets.fields.gameSystem')"
            v-model="editedSheet.gameSystem"
            :options="['dnd5e', 'pathfinder', 'gurps', 'fate', 'custom']"
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
            id="sheet-description"
            v-model="editedSheet.notes"
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
