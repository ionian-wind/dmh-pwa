<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { Note } from '@/types';
import ModuleSelector from '../components/ModuleSelector.vue';
import TagSelector from '../components/TagSelector.vue';
import NoteTypeSelector from './NoteTypeSelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/form/Button.vue';
import { useModuleStore } from '@/stores/modules';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';
import { useI18n } from 'vue-i18n';

const moduleStore = useModuleStore();
const { t } = useI18n();

const props = defineProps<{
  note: Note | null;
  isOpen: boolean;
  isEditing?: boolean;
  validationError?: string | null;
  hideModuleSelector?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', note: Note): void;
  (e: 'cancel'): void;
}>();

const editedNote = ref<Note>({
  createdAt: 0,
  updatedAt: 0,
  id: "",
  title: '',
  content: '',
  tags: [],
  moduleId: null,
  typeId: null,
  hidden: false
});

const lastNoteId = ref<string | null>(null);

const noteContent = computed({
  get: () => editedNote.value.content,
  set: (val) => { editedNote.value.content = val; }
});

watch(() => props.note, (newNote) => {
  if (newNote && newNote.id !== lastNoteId.value) {
    editedNote.value = {
      ...newNote,
      moduleId: newNote.moduleId ?? null,
      typeId: newNote.typeId ?? null
    };
    lastNoteId.value = newNote.id;
  } else if (!newNote && lastNoteId.value !== null) {
    editedNote.value = {
      createdAt: 0,
      updatedAt: 0,
      id: "",
      title: '',
      content: '',
      tags: [],
      moduleId: null,
      typeId: null,
      hidden: false
    };
    lastNoteId.value = null;
  }
}, { immediate: true });

const handleSubmit = () => {
  if (!editedNote.value.title) {
    alert('Title is required');
    return;
  }
  emit('submit', editedNote.value);
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isEditing ? t('editor.editNote') : t('editor.createNote')"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="Save Note"
    cancelLabel="Cancel"
    modalId="note-editor"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="q-pa-md q-gutter-md">
      <div class="q-mb-md">
        <h3>{{ t('editor.content') }}</h3>
        <div class="row q-col-gutter-md">
          <div class="col-12">
            <MarkdownEditor
              v-model="noteContent"
              enableMentions
              :rows="10"
              :placeholder="t('editor.contentPlaceholder')"
              class="q-input"
              label="Content"
              :current-entity-id="editedNote.id"
              current-entity-type="note"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-if="validationError" class="q-mt-md q-mb-md text-negative bg-grey-1 q-pa-sm rounded-borders">
      {{ validationError }}
    </div>
  </BaseModal>
</template>
