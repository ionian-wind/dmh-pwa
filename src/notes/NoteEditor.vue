<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Note, NoteContentType } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';
import NoteCanvas from './NoteCanvas.vue';
import NoteOptions from './NoteOptions.vue';
import { useI18n } from 'vue-i18n';
import { alert } from '@/dialogs';
import { IconDots, IconHelp } from '@tabler/icons-vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import type { MapEntityRef } from '@/maps/types';

const { t, locale } = useI18n();

const props = defineProps<{
  note: Note | null;
  isOpen: boolean;
  useModalStack?: boolean;
  isEditing?: boolean;
  validationError?: string | null;
  hideModuleSelector?: boolean;
  contentType?: NoteContentType;
}>();

const emit = defineEmits<{
  (e: 'submit', note: Note): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}>();

const editedNote = ref<Note>({
  createdAt: 0,
  updatedAt: 0,
  id: '',
  title: '',
  content: '',
  contentType: props.contentType ?? 'text',
  tags: [],
  moduleIds: [],
  typeId: null,
  hidden: false,
});

const lastNoteId = ref<string | null>(null);
const isWYSIWYGMode = ref(true);

const noteContent = computed({
  get: () => editedNote.value.content,
  set: (val) => {
    editedNote.value.content = val;
  },
});

function handleOptionsUpdate(updated: Note) {
  Object.assign(editedNote.value, updated);
}

watch(
  () => props.note,
  (newNote) => {
    if (newNote && newNote.id !== lastNoteId.value) {
      editedNote.value = {
        ...newNote,
        contentType: newNote.contentType ?? 'text',
        moduleIds: newNote.moduleIds ?? [],
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
        contentType: props.contentType ?? 'text',
        tags: [],
        moduleIds: [],
        typeId: null,
        hidden: false,
      };
      lastNoteId.value = null;
    }
  },
  { immediate: true },
);

const editorTabs = useEntityEditorTabs();
const tabs = computed(() => (props.hideModuleSelector ? [] : editorTabs.value));

const linkedModules = computed<MapEntityRef[]>(() =>
  editedNote.value.moduleIds.map((id) => ({ kind: 'module', id })),
);

function setLinkedModules(links: MapEntityRef[]) {
  editedNote.value.moduleIds = links.map((link) => link.id);
}

const markdownEditorRef = ref<any>(null);
const canvasRef = ref<InstanceType<typeof NoteCanvas> | null>(null);

const handleSubmit = async () => {
  if (!editedNote.value.title) {
    await alert(t('editor.titleRequired'));
    return;
  }
  if (editedNote.value.contentType === 'draw') {
    editedNote.value.content = canvasRef.value?.getSnapshot() ?? '';
    editedNote.value.preview =
      (await canvasRef.value?.getPreview()) || undefined;
  } else if (markdownEditorRef.value && markdownEditorRef.value.getMarkdown) {
    editedNote.value.content = markdownEditorRef.value.getMarkdown();
  }
  emit('submit', editedNote.value);
};

const handleCancel = () => {
  emit('cancel');
};

function handleDelete() {
  if (props.note) emit('delete', props.note.id);
}
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="isOpen"
    :title="isEditing ? t('common.editNote') : t('common.createNote')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!note"
    :showExpand="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="tabs"
    modalId="note-editor"
    @submit="handleSubmit"
    @delete="handleDelete"
    @cancel="handleCancel"
  >
    <template #main>
      <div class="q-pa-md q-gutter-md">
        <div class="q-mb-md">
          <QInput
            v-model="editedNote.title"
            :placeholder="t('editor.title')"
            required
            borderless
            hide-bottom-space
            input-style="font-size: 1.5rem; font-weight: 500;"
            type="text"
          />
        </div>
        <div class="q-mb-md">
          <slot
            name="content"
            :note="editedNote"
            :content-type="editedNote.contentType"
            :update-content="(value: string) => (noteContent = value)"
          >
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <NoteCanvas
                  v-if="editedNote.contentType === 'draw'"
                  ref="canvasRef"
                  :model-value="editedNote.content"
                />
                <MarkdownEditor
                  v-else
                  ref="markdownEditorRef"
                  v-model="noteContent"
                  enableMentions
                  :isWYSIWYGMode="isWYSIWYGMode"
                  :placeholder="t('editor.contentPlaceholder')"
                  :current-entity-id="editedNote.id"
                  current-entity-type="note"
                  :tags="editedNote.tags"
                />
              </div>
            </div>
          </slot>
        </div>
      </div>
    </template>

    <template #links>
      <EntitiesLinking
        kind="module"
        :model-value="linkedModules"
        @update:model-value="setLinkedModules"
      />
    </template>

    <template #footer>
      <div class="note-footer-actions q-mr-auto row items-center q-gutter-sm">
        <QBtn
          flat
          round
          class="note-options-button"
          title="options"
          aria-label="options"
        >
          <IconDots />
          <QMenu class="note-options-menu">
            <QCard class="note-options-card q-pa-md">
              <NoteOptions
                :note="editedNote"
                @update:note="handleOptionsUpdate"
              />
            </QCard>
          </QMenu>
        </QBtn>
        <QToggle left-label v-model="isWYSIWYGMode">
          {{ t('markdownEditor.visualMode') }}
        </QToggle>
        <QBtn
          v-if="!isWYSIWYGMode"
          flat
          round
          class="note-help-button"
          :title="t('markdownEditor.formattingHelp')"
          :aria-label="t('markdownEditor.formattingHelp')"
          :href="helpHref('reference/markdown', getHelpLocale(locale))"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconHelp />
        </QBtn>
      </div>
    </template>

    <div
      v-if="validationError"
      class="q-mt-md q-mb-md text-negative bg-grey-1 q-pa-sm rounded-borders"
    >
      {{ validationError }}
    </div>
  </BaseModal>
</template>
