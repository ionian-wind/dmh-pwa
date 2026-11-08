<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Encounter } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import type { MapEntityRef } from '@/maps/types';
import { useI18n } from 'vue-i18n';
import { alert } from '@/dialogs';

const props = defineProps<{
  encounter: Encounter | null;
  isOpen: boolean;
  useModalStack?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', encounter: Encounter): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}>();

type EncounterFormData = Omit<Encounter, 'id' | 'createdAt' | 'updatedAt'>;

const editedEncounter = ref<EncounterFormData>({
  name: '',
  description: '',
  pawns: {},
});

const isEditing = computed(() => !!props.encounter?.id);
const editorTabs = useEntityEditorTabs();
const relations = useEntityLinkRelations();

const linkedNotes = computed<MapEntityRef[]>(() => {
  const id = props.encounter?.id;
  return id
    ? relations
        .getLinkedIds('encounter', id, 'note')
        .map((noteId) => ({ kind: 'note' as const, id: noteId }))
    : [];
});

function setLinkedNotes(links: MapEntityRef[]) {
  if (!props.encounter?.id) return;
  void relations.setLinkedIds(
    'encounter',
    props.encounter.id,
    'note',
    links.filter((link) => link.kind === 'note').map((link) => link.id),
  );
}

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
        pawns: {},
      };
    }
  },
  { immediate: true },
);

const resetForm = () => {
  editedEncounter.value = {
    name: '',
    description: '',
    pawns: {},
  };
};

const handleSubmit = async () => {
  if (!editedEncounter.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }

  emit('submit', {
    ...editedEncounter.value,
    id: props.encounter?.id ?? '',
    createdAt: props.encounter?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
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

function handleDelete() {
  if (props.encounter) emit('delete', props.encounter.id);
}
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="isOpen"
    :title="isEditing ? t('encounters.edit') : t('encounters.create')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="isEditing"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="encounter-editor-modal"
    @submit="handleSubmit"
    @delete="handleDelete"
    @cancel="closeEditor"
  >
    <template #main>
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
    </template>

    <template #links>
      <EntitiesLinking
        v-if="props.encounter"
        kind="note"
        :model-value="linkedNotes"
        @update:model-value="setLinkedNotes"
      />
    </template>
  </BaseModal>
</template>
