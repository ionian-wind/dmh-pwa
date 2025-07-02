<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { Note } from '@/types';
import ModuleSelector from './ModuleSelector.vue';
import TagSelector from './TagSelector.vue';
import NoteTypeSelector from './NoteTypeSelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import Button from '@/components/common/Button.vue';
import { useModuleStore } from '@/stores/modules';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';
import { useI18n } from 'vue-i18n';

const moduleStore = useModuleStore();
const { t } = useI18n();

const props = defineProps<{
  note: Note | null;
  isOpen: boolean;
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
    :title="note ? 'notes.edit' : 'notes.create'"
    :showSubmit="true"
    :showCancel="true"
    submitLabel="common.save"
    cancelLabel="common.cancel"
    modalId="note-editor-modal"
    show-expand
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div v-if="validationError" class="validation-error">{{ validationError }}</div>
    <div class="form-section">
      <h3>{{ t('editor.basicInformation') }}</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="title">{{ t('editor.title') }}</label>
          <input
            id="title"
            v-model="editedNote.title"
            type="text"
            required
            :placeholder="t('editor.titlePlaceholder')"
          >
        </div>
        <div class="form-group">
          <label for="module">{{ t('editor.module') }}</label>
          <ModuleSelector
            v-if="!props.hideModuleSelector"
            v-model="editedNote.moduleId"
            :placeholder="t('common.noModule')"
            :allowAnyModule="false"
          />
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="type">{{ t('editor.type') }}</label>
          <NoteTypeSelector
            v-model="editedNote.typeId"
            :placeholder="t('noteTypeSelector.noType')"
            allow-create
          />
        </div>
        <div class="form-group">
          <label for="tags">{{ t('editor.tags') }}</label>
          <TagSelector
            v-model="editedNote.tags"
            :placeholder="t('editor.addTags')"
          />
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>{{ t('editor.content') }}</h3>
      <div class="form-group">
        <MarkdownEditor
          v-model="noteContent"
          enableMentions
          :rows="10"
          :placeholder="t('editor.contentPlaceholder')"
          className="content-editor"
          label="Content"
          :current-entity-id="editedNote.id"
          current-entity-type="note"
        />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
/* No need for .form-section, .form-grid, .form-group, label, input, select, textarea styles here; now in global.css */
.validation-error {
  color: var(--color-danger);
  background: var(--color-background-soft);
  border: 1px solid var(--color-danger);
  border-radius: 4px;
  padding: 0.75em 1em;
  margin-bottom: 1em;
  font-weight: 500;
}
</style>
