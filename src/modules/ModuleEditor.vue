<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { Module } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import { useI18n } from 'vue-i18n';
import { alert } from '@/dialogs';

const props = defineProps<{
  module: Module | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', module: Omit<Module, 'id'>): void;
  (e: 'cancel'): void;
}>();

const editedModule = ref<Omit<Module, 'id' | 'createdAt' | 'updatedAt'>>({
  name: '',
  description: '',
});

const { t } = useI18n();

watch(
  () => props.module,
  (newModule) => {
    if (newModule) {
      const { id, createdAt, updatedAt, ...moduleData } = newModule;
      editedModule.value = moduleData;
    } else {
      editedModule.value = {
        name: '',
        description: '',
      };
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  if (!editedModule.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }
  emit('submit', {
    ...editedModule.value,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="module ? t('modules.edit') : t('modules.create')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="module-editor-modal"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            id="module-name"
            :label="t('modules.fields.name')"
            v-model="editedModule.name"
            type="text"
            required
            outlined
          />
        </div>
        <div class="form-group">
          <QInput
            :label="t('modules.fields.description')"
            id="module-description"
            v-model="editedModule.description"
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
