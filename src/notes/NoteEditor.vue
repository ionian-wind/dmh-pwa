<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Note } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';
import NoteOptions from './NoteOptions.vue';
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import { alert } from '@/dialogs';

import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import type { MapEntityRef } from '@/maps/types';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import { ensureBlockAnchors } from '@/utils/noteAnchors';

const { t, locale } = useI18n();

const props = defineProps<{
  note: Note | null;
  isOpen: boolean;
  useModalStack?: boolean;
  isEditing?: boolean;
  validationError?: string | null;
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
  tags: [],
  typeId: null,
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
        typeId: null,
      };
      lastNoteId.value = null;
    }
  },
  { immediate: true },
);

const editorTabs = useEntityEditorTabs();
const relations = useEntityLinkRelations();
const noteLinkKinds = [
  'character',
  'pawn',
  'party',
  'encounter',
  'location',
] as const;
const tabs = computed(() => editorTabs.value);

const noteLinks = computed<MapEntityRef[]>(() => {
  const id = editedNote.value.id;
  if (!id) return [];
  return noteLinkKinds.flatMap((kind) =>
    relations
      .getLinkedIds('note', id, kind)
      .map((linkId) => ({ kind, id: linkId })),
  );
});

function setNoteLinks(
  kind: (typeof noteLinkKinds)[number],
  links: MapEntityRef[],
) {
  if (!editedNote.value.id) return;
  void relations.setLinkedIds(
    'note',
    editedNote.value.id,
    kind,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

const markdownEditorRef = ref<any>(null);

const handleSubmit = async () => {
  if (markdownEditorRef.value && markdownEditorRef.value.getMarkdown) {
    editedNote.value.content = markdownEditorRef.value.getMarkdown();
  }
  editedNote.value.content = ensureBlockAnchors(editedNote.value.content ?? '');
  if (!editedNote.value.title?.trim() && !editedNote.value.content?.trim()) {
    await alert(t('editor.titleOrContentRequired'));
    return;
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
        <QInput
          v-model="editedNote.title"
          :placeholder="t('editor.title')"
          borderless
          hide-bottom-space
          input-style="font-size: 1.5rem; font-weight: 500;"
          type="text"
        />
        <slot
          name="content"
          :note="editedNote"
          :update-content="(value: string) => (noteContent = value)"
        >
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <MarkdownEditor
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
    </template>

    <template #links>
      <div class="column q-gutter-md">
        <EntitiesLinking
          v-for="kind in noteLinkKinds"
          :key="kind"
          :kind="kind"
          :model-value="noteLinks"
          @update:model-value="(links) => setNoteLinks(kind, links)"
        />
      </div>
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
          <QIcon name="tabler-dots" />
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
          v-if="!isWYSIWYGMode && features.help"
          flat
          round
          class="note-help-button"
          :title="t('markdownEditor.formattingHelp')"
          :aria-label="t('markdownEditor.formattingHelp')"
          :href="helpHref('reference/markdown', getHelpLocale(locale))"
          target="_blank"
          rel="noopener noreferrer"
        >
          <QIcon name="tabler-help" />
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
