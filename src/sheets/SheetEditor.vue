<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import { nanoid } from 'nanoid';
import type { SheetDefinition } from '@/types';
import { QInput } from 'quasar';

interface Props {
  sheet?: SheetDefinition | null;
  isOpen: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  sheet: null,
});

const emit = defineEmits<{
  (e: 'submit', sheet: SheetDefinition): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();

const blankSheet = (): SheetDefinition => ({
  id: '',
  name: '',
  description: '',
  system: '',
  layout: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const editedSheet = ref<SheetDefinition>(
  props.sheet ? { ...props.sheet } : blankSheet(),
);
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
  // Update timestamp
  editedSheet.value.updatedAt = Date.now();
  
  // If it's a new sheet without an ID, assign one now before submitting
  if (!editedSheet.value.id) {
    editedSheet.value.id = nanoid();
    editedSheet.value.createdAt = Date.now();
  }
  
  emit('submit', { ...editedSheet.value });
  resetForm();
}

function handleCancel() {
  resetForm();
  emit('cancel');
}
</script>

<template>
  <BaseModal
    :is-open="props.isOpen"
    :title="editedSheet ? (isEditing ? t('sheets.edit') : t('sheets.create')) : ''"
    :show-submit="true"
    :show-cancel="true"
    modal-id="sheet-editor"
    @submit="handleSubmit"
    @cancel="handleCancel"
    class="sheet-editor-modal"
  >
    <div v-if="editedSheet" class="q-gutter-y-md">
      <QInput
        v-model="editedSheet.name"
        :label="t('common.name')"
        outlined
        :rules="[(val) => (val && val.length > 0) || t('common.required')]"
      />
      <QInput
        v-model="editedSheet.description"
        :label="t('common.description')"
        outlined
        type="textarea"
        autogrow
      />
      <QInput
        v-model="editedSheet.system"
        :label="t('sheets.system')"
        outlined
        hint="TTRPG system (e.g. D&D 5e, Pathfinder 2e, etc.)"
      />
    </div>
  </BaseModal>
</template>

<style scoped>
.sheet-editor-modal :deep(.q-dialog__inner) {
  min-width: 60vw;
  min-height: 40vh;
}
</style>