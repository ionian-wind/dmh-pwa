<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { useMentionsStore } from '@/utils/storage';
import { usePartyStore } from '@/stores/parties';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import type { Note } from '@/types';
import { extractMentionedEntities } from '@/utils/markdownParser';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import EntityContentSurface from '@/components/common/EntityContentSurface.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import MarkdownHelpDialog from '@/components/common/MarkdownHelpDialog.vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';
import Markdown from '@/components/common/Markdown.vue';
import NoteCanvas from '@/notes/NoteCanvas.vue';
import NoteViewSidebar from '@/notes/NoteViewSidebar.vue';
import { IconHelp } from '@tabler/icons-vue';
import { alert, confirm } from '@/dialogs';
import { useEntityEditMode } from '@/composables/useEntityEditMode';
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

const activeTab = ref('main');
const viewTabs = useEntityViewTabs();
const editorTabs = useEntityEditorTabs();
const isLoaded = computed(() => noteStore.isLoaded);
const note = ref<Note | null>(null);
const notFound = computed(() => isLoaded.value && !note.value);
const validationError = ref<string | null>(null);
const noteContent = ref('');
const canvasDirty = ref(false);
const isHelpOpen = ref(false);
const isDeleting = ref(false);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);
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

const { editState, setEditMode, discardDraft } = useEntityEditMode<Note>({
  source: note,
  clone: (source) => ({
    ...source,
    tags: [...(source.tags ?? [])],
    moduleIds: [...(source.moduleIds ?? [])],
    contentType: source.contentType ?? 'text',
    typeId: source.typeId ?? null,
  }),
  isDirty: (draft, source) =>
    canvasDirty.value ||
    draft.title !== source.title ||
    draft.content !== source.content ||
    (draft.typeId ?? null) !== (source.typeId ?? null) ||
    (draft.backgroundColor ?? '') !== (source.backgroundColor ?? '') ||
    draft.hidden !== source.hidden ||
    !arraysEqual(draft.tags, source.tags) ||
    !arraysEqual(draft.moduleIds, source.moduleIds),
  extraDirty: () => canvasDirty.value,
  onEnter: () => {
    validationError.value = null;
    canvasDirty.value = false;
  },
  onDiscard: () => {
    validationError.value = null;
    canvasDirty.value = false;
    if (note.value) noteContent.value = note.value.content;
  },
  prepare: prepareDraft,
  save: persistDraft,
});

const tabs = computed(() =>
  editState.isEditMode
    ? editorTabs.value.map((tab) => ({
        id: tab.name,
        label: tab.title,
        icon: tab.icon,
      }))
    : viewTabs.value,
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
    !!editState.draft &&
    editState.draft.content !== (note.value?.content ?? '');
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

async function prepareDraft(draft: Note): Promise<boolean> {
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
  return true;
}

async function persistDraft(draft: Note): Promise<boolean> {
  if (!note.value) return false;
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
  updateNoteFromStore();
  return true;
}

const headerButtons = computed(() => {
  if (!editState.isEditMode || editState.isVisualMode) return [];

  return [
    {
      color: 'primary',
      title: 'markdownEditor.formattingHelp',
      icon: IconHelp,
      event: () => {
        isHelpOpen.value = true;
      },
    },
  ];
});

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
});

onBeforeUnmount(() => {
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
    :title="editState.isEditMode ? '' : noteTitle"
    :not-found="notFound"
    :header-buttons="headerButtons"
    :tabs="tabs"
    v-model="activeTab"
  >
    <template #main>
      <EntityContentSurface
        v-if="!editState.isEditMode"
        :background-color="note?.backgroundColor"
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
      </EntityContentSurface>

      <EntityInlineEditor
        v-else
        v-model:title="draftTitle"
        :title-placeholder="t('editor.title')"
        :validation-error="validationError"
      >
        <NoteCanvas
          v-if="editState.draft?.contentType === 'draw'"
          ref="canvasRef"
          :model-value="draftContent"
          @change="handleCanvasChange"
        />
        <EntityMarkdownEditor
          v-else
          ref="markdownEditorRef"
          v-model="draftContent"
          :is-visual-mode="editState.isVisualMode"
          :entity-id="editState.draft?.id || ''"
          entity-type="note"
          :placeholder="t('editor.contentPlaceholder')"
          :tags="editState.draft?.tags ?? []"
        />
      </EntityInlineEditor>
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
