<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { Encounter } from '@/types';
import ModuleSelector from '../components/ModuleSelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useI18n } from 'vue-i18n';
import { alert } from '@/dialogs';

const props = defineProps<{
  encounter: Encounter | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (
    e: 'submit',
    encounter: Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>,
  ): void;
  (e: 'cancel'): void;
}>();

type EncounterFormData = Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>;

const editedEncounter = ref<EncounterFormData>({
  name: '',
  description: '',
  monsters: {},
  moduleId: '',
  notes: '',
});

const isEditing = computed(() => !!props.encounter?.id);

const { t } = useI18n();

watch(
  () => props.encounter,
  (newEncounter) => {
    if (newEncounter) {
      const { id, createdAt, updatedAt, ...encounterData } = newEncounter;
      editedEncounter.value = encounterData;
    } else {
      editedEncounter.value = {
        name: '',
        description: '',
        monsters: {},
        moduleId: '',
        notes: '',
      };
    }
  },
  { immediate: true },
);

const resetForm = () => {
  editedEncounter.value = {
    name: '',
    description: '',
    monsters: {},
    moduleId: '',
    notes: '',
  };
};

const handleSubmit = async () => {
  if (!editedEncounter.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }

  if (!editedEncounter.value.moduleId) {
    await alert(t('common.moduleRequired'));
    return;
  }

  emit('submit', editedEncounter.value);
  closeEditor();
};

const closeEditor = () => {
  resetForm();
  emit('cancel');
};

defineExpose({
  openEditor: (encounterToEdit?: Encounter) => {
    if (encounterToEdit) {
      const { id, createdAt, updatedAt, ...encounterData } = encounterToEdit;
      editedEncounter.value = encounterData;
    } else {
      resetForm();
    }
  },
});
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isEditing ? t('encounters.edit') : t('encounters.create')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="encounter-editor-modal"
    @submit="handleSubmit"
    @cancel="closeEditor"
  >
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            id="encounter-name"
            :label="t('encounters.fields.name')"
            v-model="editedEncounter.name"
            type="text"
            required
            outlined
          />
        </div>
        <div class="form-group">
          <ModuleSelector
            id="encounter-module"
            v-model="editedEncounter.moduleId"
            :placeholder="'encounters.fields.module'"
            :allowAnyModule="false"
            required
          />
        </div>
        <div class="form-group">
          <QInput
            :label="t('encounters.fields.description')"
            id="encounter-description"
            v-model="editedEncounter.description"
            type="textarea"
            :rows="5"
            autogrow
            outlined
          />
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-group">
        <QInput
          :label="t('editor.notes')"
          id="encounter-description"
          v-model="editedEncounter.notes"
          type="textarea"
          :rows="5"
          autogrow
          outlined
        />
      </div>
    </div>
  </BaseModal>
</template>
