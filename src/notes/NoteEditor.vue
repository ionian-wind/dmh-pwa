<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import type { Note } from '@/types';
import ModuleSelector from '../components/ModuleSelector.vue';
import TagSelector from '../components/common/TagSelector.vue';
import NoteTypeSelector from './NoteTypeSelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useModuleStore } from '@/stores/modules';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';
import { useI18n } from 'vue-i18n';
import { alert } from '@/dialogs';

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
  id: '',
  title: '',
  content: '',
  tags: [],
  moduleId: null,
  typeId: null,
  hidden: false,
});

const lastNoteId = ref<string | null>(null);

const noteContent = computed({
  get: () => editedNote.value.content,
  set: (val) => {
    editedNote.value.content = val;
  },
});

watch(
  () => props.note,
  (newNote) => {
    if (newNote && newNote.id !== lastNoteId.value) {
      editedNote.value = {
        ...newNote,
        moduleId: newNote.moduleId ?? null,
        typeId: newNote.typeId ?? null,
      };
      lastNoteId.value = newNote.id;
    } else if (!newNote && lastNoteId.value !== null) {
      editedNote.value = {
        createdAt: 0,
        updatedAt: 0,
        id: '',
        title: '',
        content: '',
        tags: [],
        moduleId: null,
        typeId: null,
        hidden: false,
      };
      lastNoteId.value = null;
    }
  },
  { immediate: true },
);

const markdownEditorRef = ref<any>(null);

const handleSubmit = async () => {
  if (!editedNote.value.title) {
    await alert('Title is required');
    return;
  }
  // Get latest markdown from editor instance (Milkdown/Crepe form integration)
  if (markdownEditorRef.value && markdownEditorRef.value.getMarkdown) {
    editedNote.value.content = markdownEditorRef.value.getMarkdown();
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
    :title="isEditing ? t('common.editNote') : t('common.createNote')"
    :showSubmit="true"
    :showCancel="true"
    :showExpand="true"
    submitLabel="Save Note"
    cancelLabel="Cancel"
    modalId="note-editor"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="q-pa-md q-gutter-md">
      <div class="q-mb-md">
        <QInput
          v-model="editedNote.title"
          :label="t('editor.title')"
          required
          autofocus
          dense
          outlined
          :error="!editedNote.title"
          :error-message="!editedNote.title ? t('editor.titleRequired') : ''"
        />
      </div>
      <div class="q-mb-md">
        <NoteTypeSelector
          :allow-create="true"
          v-model="editedNote.typeId"
          :module-id="editedNote.moduleId"
        />
      </div>
      <div class="q-mb-md">
        <TagSelector
          v-model="editedNote.tags"
          :entity-type="'note'"
          :current-entity-id="editedNote.id"
        />
      </div>
      <div class="q-mb-md">
        <h3>{{ t('editor.content') }}</h3>
        <div class="row q-col-gutter-md">
          <div class="col-12">
            <MarkdownEditor
              ref="markdownEditorRef"
              v-model="noteContent"
              enableMentions
              :placeholder="t('editor.contentPlaceholder')"
              :current-entity-id="editedNote.id"
              current-entity-type="note"
            />
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="validationError"
      class="q-mt-md q-mb-md text-negative bg-grey-1 q-pa-sm rounded-borders"
    >
      {{ validationError }}
    </div>
  </BaseModal>
</template>
