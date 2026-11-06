<script setup lang="ts">
import {
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
  computed,
  watch,
} from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { useMentionsStore } from '@/utils/storage';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import type { Note, NoteEditState } from '@/types';
import { extractMentionedEntities } from '@/utils/markdownParser';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import MarkdownEditor from '@/components/common/MarkdownEditor.vue';
import MarkdownHelpDialog from '@/components/common/MarkdownHelpDialog.vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';
import Markdown from '@/components/common/Markdown.vue';
import NoteCanvas from '@/notes/NoteCanvas.vue';
import NoteViewSidebar from '@/notes/NoteViewSidebar.vue';
import { downloadNote } from '@/notes/downloadNote';
import { IconFileDownload, IconHelp } from '@tabler/icons-vue';
import { alert, confirm } from '@/dialogs';
import {
  confirmUnsavedChanges,
  type UnsavedChangesChoice,
} from '@/dialogs/unsavedChanges';
import { useRightDrawer } from '@/composables/useLayout';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const noteStore = useNoteStore();
const moduleStore = useModuleStore();
const mentionsStore = useMentionsStore();
const partyStore = usePartyStore();
const monsterStore = useMonsterStore();
const encounterStore = useEncounterStore();

const editState = reactive<NoteEditState>({
  isEditMode: false,
  isVisualMode: true,
  draft: null,
});
const activeTab = ref('main');
const viewTabs = useEntityViewTabs();
const editorTabs = useEntityEditorTabs();
const tabs = computed(() =>
  editState.isEditMode
    ? editorTabs.value.map((tab) => ({
        id: tab.name,
        label: tab.title,
        icon: tab.icon,
      }))
    : viewTabs.value,
);
const isLoaded = computed(() => noteStore.isLoaded);
const note = ref<Note | null>(null);
const notFound = computed(() => isLoaded.value && !note.value);
const validationError = ref<string | null>(null);
const noteContent = ref('');
const canvasDirty = ref(false);
const isHelpOpen = ref(false);
const isDeleting = ref(false);
const markdownEditorRef = ref<any>(null);
const canvasRef = ref<InstanceType<typeof NoteCanvas> | null>(null);

function updateNoteFromStore() {
  if (!noteStore.isLoaded) {
    return;
  }
  const found = noteStore.getById(route.params.id as string);
  if (found) {
    note.value = found;
  } else if (!isDeleting.value) {
    router.push('/notes');
  }
}

watch([() => noteStore.items, () => noteStore.isLoaded], updateNoteFromStore, {
  immediate: true,
});

watch(
  note,
  (n) => {
    if (n) noteContent.value = n.content;
  },
  { immediate: true },
);

function handleMarkdownContentChange(newContent: string) {
  noteContent.value = newContent;
  if (note.value) {
    noteStore.update(note.value.id, { content: newContent });
  }
}

function handleCanvasChange() {
  const snapshot = canvasRef.value?.getSnapshot?.();
  if (snapshot && editState.draft) {
    editState.draft.content = snapshot;
  }
  canvasDirty.value =
    !!editState.draft && editState.draft.content !== (note.value?.content ?? '');
}

const draftTitle = computed({
  get: () => editState.draft?.title ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.title = value;
  },
});

const draftContent = computed({
  get: () => editState.draft?.content ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.content = value;
  },
});

const linkedModules = computed<MapEntityRef[]>(() =>
  (editState.draft?.moduleIds ?? []).map((id) => ({
    kind: 'module',
    id,
  })),
);

const noteLinks = computed<MapEntityRef[]>(() =>
  (note.value?.moduleIds ?? []).map((id) => ({ kind: 'module', id })),
);

function setLinkedModules(links: MapEntityRef[]) {
  if (editState.draft) {
    editState.draft.moduleIds = links.map((link) => link.id);
  }
}

function arraysEqual(a: string[] = [], b: string[] = []) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const isDirty = computed(() => {
  if (!editState.isEditMode || !note.value || !editState.draft) return false;
  const draft = editState.draft;
  const base = note.value;
  return (
    canvasDirty.value ||
    draft.title !== base.title ||
    draft.content !== base.content ||
    (draft.typeId ?? null) !== (base.typeId ?? null) ||
    (draft.backgroundColor ?? '') !== (base.backgroundColor ?? '') ||
    draft.hidden !== base.hidden ||
    !arraysEqual(draft.tags, base.tags) ||
    !arraysEqual(draft.moduleIds, base.moduleIds)
  );
});

function enterEditMode() {
  if (!note.value) return;
  editState.draft = {
    ...note.value,
    tags: [...(note.value.tags ?? [])],
    moduleIds: [...(note.value.moduleIds ?? [])],
    contentType: note.value.contentType ?? 'text',
    typeId: note.value.typeId ?? null,
  };
  validationError.value = null;
  canvasDirty.value = false;
  editState.isEditMode = true;
}

function discardDraft() {
  editState.isEditMode = false;
  editState.draft = null;
  validationError.value = null;
  canvasDirty.value = false;
  if (note.value) noteContent.value = note.value.content;
}

function findMissingMentions(draft: Note): string[] {
  const mentions =
    draft.contentType === 'draw' ? [] : extractMentionedEntities(draft.content);
  const missing: string[] = [];
  for (const mention of mentions) {
    let exists = false;
    switch (mention.kind) {
      case 'note':
        exists = !!noteStore.getById(mention.id);
        break;
      case 'module':
        exists = !!moduleStore.getById(mention.id);
        break;
      case 'party':
        exists = !!partyStore.getById(mention.id);
        break;
      case 'monster':
        exists = !!monsterStore.getById(mention.id);
        break;
      case 'encounter':
        exists = !!encounterStore.getById(mention.id);
        break;
      default:
        exists = true; // ignore unknown kinds
    }
    if (!exists) {
      missing.push(`${mention.kind}:${mention.id}`);
    }
  }
  return missing;
}

async function saveDraft(): Promise<boolean> {
  if (!editState.isEditMode) return true;

  const draft = editState.draft;
  if (!draft || !note.value) {
    discardDraft();
    return true;
  }

  if (!isDirty.value) {
    discardDraft();
    return true;
  }

  if (draft.contentType === 'draw') {
    const snapshot = canvasRef.value?.getSnapshot?.();
    if (snapshot) draft.content = snapshot;
    const preview = await canvasRef.value?.getPreview?.();
    if (preview) draft.preview = preview;
  } else if (markdownEditorRef.value?.getMarkdown) {
    draft.content = markdownEditorRef.value.getMarkdown();
  }

  if (!draft.title?.trim()) {
    activeTab.value = 'main';
    await alert(t('editor.titleRequired'));
    return false;
  }

  const missing = findMissingMentions(draft);
  if (missing.length > 0) {
    activeTab.value = 'main';
    validationError.value = `Cannot save: the following mentioned entities do not exist: ${missing.join(', ')}`;
    return false;
  }

  validationError.value = null;
  try {
    await noteStore.update(note.value.id, {
      title: draft.title,
      content: draft.content,
      contentType: draft.contentType,
      tags: draft.tags,
      moduleIds: draft.moduleIds,
      typeId: draft.typeId,
      backgroundColor: draft.backgroundColor,
      preview: draft.preview,
    });
  } catch (error) {
    activeTab.value = 'main';
    validationError.value =
      error instanceof Error ? error.message : String(error);
    return false;
  }

  discardDraft();
  updateNoteFromStore();
  return true;
}

async function setEditMode(value: boolean) {
  if (value === editState.isEditMode) return;
  if (value) {
    enterEditMode();
  } else {
    await saveDraft();
  }
}

const handleDownload = () => {
  if (note.value) downloadNote(note.value);
};

const downloadButtons = computed(() =>
  editState.isEditMode
    ? []
    : [
        {
          color: 'warning',
          title: 'common.download',
          icon: IconFileDownload,
          event: handleDownload,
          disabled: note.value?.contentType === 'draw' && !note.value?.preview,
        },
      ],
);

const headerButtons = computed(() =>
  editState.isEditMode
    ? [
        {
          color: 'primary',
          title: 'markdownEditor.formattingHelp',
          icon: IconHelp,
          event: () => {
            isHelpOpen.value = true;
          },
        },
      ]
    : [],
);

const handleDelete = async () => {
  if (!note.value) return false;
  if (
    !(await confirm(t('common.confirmDelete', { title: note.value.title })))
  ) {
    return false;
  }
  isDeleting.value = true;
  discardDraft();
  await noteStore.remove(note.value.id);
  return true;
};

// Computed properties for BaseEntityView
const noteTitle = computed(() => note.value?.title || '');

const rightDrawer = useRightDrawer();

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}

onBeforeRouteLeave(async () => {
  if (!isDirty.value) return true;

  const choice: UnsavedChangesChoice = await confirmUnsavedChanges();
  if (choice === 'cancel') return false;
  if (choice === 'discard') {
    discardDraft();
    return true;
  }
  return saveDraft();
});

onMounted(async () => {
  await noteStore.load();
  await moduleStore.load();
  await mentionsStore.load();
  await partyStore.load();
  await monsterStore.load();
  await encounterStore.load();

  rightDrawer.set({
    component: NoteViewSidebar,
    props: {
      note,
      editState,
      onSetEditMode: setEditMode,
    },
  });

  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  rightDrawer.clear();
});
</script>

<template>
  <BaseEntityTabView
    :entity="note"
    entity-name="notes.title"
    list-route="/notes"
    :on-delete="handleDelete"
    :header-show-edit="false"
    :header-show-delete="editState.isEditMode"
    :is-editing="editState.isEditMode"
    :title="noteTitle"
    :not-found="notFound"
    :left-header-buttons="downloadButtons"
    :header-buttons="headerButtons"
    :tabs="tabs"
    v-model="activeTab"
  >
    <template #main>
      <div
        v-if="!editState.isEditMode"
        class="note-content-surface"
        :style="
          note?.backgroundColor
            ? { backgroundColor: note.backgroundColor }
            : undefined
        "
      >
        <NoteCanvas
          v-if="note?.contentType === 'draw'"
          :model-value="noteContent"
          readonly
        />
        <Markdown
          v-else
          :taskCheckboxEnabled="true"
          :enableMentionModal="true"
          :content="noteContent"
          @update:content="handleMarkdownContentChange"
        />
      </div>

      <div v-else class="note-editor-content q-pa-md q-gutter-md">
        <div class="q-mb-md">
          <QInput
            v-model="draftTitle"
            :placeholder="t('editor.title')"
            required
            borderless
            hide-bottom-space
            input-style="font-size: 1.5rem; font-weight: 500;"
            type="text"
          />
        </div>
        <div class="q-mb-md">
          <NoteCanvas
            v-if="editState.draft?.contentType === 'draw'"
            ref="canvasRef"
            :model-value="draftContent"
            @change="handleCanvasChange"
          />
          <MarkdownEditor
            v-else
            ref="markdownEditorRef"
            v-model="draftContent"
            enableMentions
            :isWYSIWYGMode="editState.isVisualMode"
            :placeholder="t('editor.contentPlaceholder')"
            :current-entity-id="editState.draft?.id || ''"
            current-entity-type="note"
            :tags="editState.draft?.tags ?? []"
          />
        </div>
        <div
          v-if="validationError"
          class="text-negative bg-grey-1 q-pa-sm rounded-borders"
        >
          {{ validationError }}
        </div>
      </div>
    </template>

    <template #links>
      <EntityViewLinks v-if="!editState.isEditMode" :links="noteLinks" />
      <EntitiesLinking
        v-else
        kind="module"
        :model-value="linkedModules"
        @update:model-value="setLinkedModules"
      />
    </template>
  </BaseEntityTabView>

  <MarkdownHelpDialog v-model:is-open="isHelpOpen" />
</template>

<style scoped>
.note-content-surface {
  min-height: 100%;
  padding: 1rem;
  border-radius: var(--border-radius);
}

.markdown-content {
  font-family: var(--font-family);
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 1.5em 0 0.5em;
  color: var(--color-text);
}

.markdown-content :deep(p) {
  margin: 1em 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-content :deep(li) {
  margin: 0.5em 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--color-primary);
  padding-left: 1em;
  margin: 1em 0;
  color: var(--color-text-light);
}

.markdown-content :deep(code) {
  background: var(--color-background-soft);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-content :deep(pre) {
  background: var(--color-background-soft);
  padding: 1em;
  border-radius: var(--border-radius);
  overflow-x: auto;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}
</style>
