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
    await alert('Name is required');
    return;
  }

  if (!editedEncounter.value.moduleId) {
    await alert('Module is required');
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
    :title="isEditing ? 'encounters.edit' : 'encounters.create'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="common.save"
    cancelLabel="common.cancel"
    modalId="encounter-editor-modal"
    @submit="handleSubmit"
    @cancel="closeEditor"
  >
    <div class="form-section">
      <h3>{{ t('editor.basicInformation') }}</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="encounter-name">{{ t('common.name') }}</label>
          <QInput
            id="encounter-name"
            v-model="editedEncounter.name"
            type="text"
            required
            :placeholder="t('encounters.namePlaceholder')"
            dense
            outlined
          />
        </div>
        <div class="form-group">
          <label for="encounter-module">{{ t('editor.module') }}</label>
          <ModuleSelector
            id="encounter-module"
            v-model="editedEncounter.moduleId"
            :placeholder="t('common.noModule')"
            :allowAnyModule="false"
            required
          />
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>{{ t('editor.description') }}</h3>
      <div class="form-group">
        <label for="encounter-description">{{ t('editor.description') }}</label>
        <QInput
          id="encounter-description"
          v-model="editedEncounter.description"
          type="textarea"
          :rows="3"
          :placeholder="t('encounters.descriptionPlaceholder')"
          dense
          outlined
        />
      </div>
    </div>
    <div class="form-section">
      <h3>{{ t('editor.notes') }}</h3>
      <div class="form-group">
        <label for="encounter-notes">{{ t('editor.notes') }}</label>
        <QInput
          id="encounter-notes"
          v-model="editedEncounter.notes"
          type="textarea"
          :rows="3"
          :placeholder="t('encounters.notesPlaceholder')"
          dense
          outlined
        />
      </div>
    </div>
  </BaseModal>
</template>
