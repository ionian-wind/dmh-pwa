<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import { useNoteStore } from '@/stores/notes';
import { useMentionsStore } from '@/utils/storage';
import { useBookmarkStore } from '@/stores/bookmarks';
import type { Note } from '@/types';
import type { TocItem } from '@/components/common/milkdown/plugins/toc';
import { extractMentionedEntities } from '@/utils/markdownParser';
import { ensureBlockAnchors } from '@/utils/noteAnchors';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import EntityContentSurface from '@/components/common/EntityContentSurface.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import NoteCanvas from '@/notes/NoteCanvas.vue';
import NoteViewSidebar from '@/notes/NoteViewSidebar.vue';
import { IconHelp } from '@tabler/icons-vue';
import { alert, confirm } from '@/dialogs';
import { useEntityEditMode } from '@/composables/useEntityEditMode';
import { useRightDrawer } from '@/composables/useLayout';
import { useFeatureStores } from '@/composables/useFeatureStores';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const noteStore = useNoteStore();
const mentionsStore = useMentionsStore();
const bookmarkStore = useBookmarkStore();
const featureStores = useFeatureStores();

const activeTab = ref('main');
const viewTabs = useEntityViewTabs();
const editorTabs = useEntityEditorTabs();
const isLoaded = computed(() => noteStore.isLoaded);
const note = ref<Note | null>(null);
const notFound = computed(() => isLoaded.value && !note.value);
const validationError = ref<string | null>(null);
const noteContent = ref('');
const tocItems = ref<TocItem[]>([]);
const tocReady = ref(false);
const bookmarkedAnchorIds = computed(
  () =>
    new Set(
      (note.value ? bookmarkStore.bookmarksFor('note', note.value.id) : []).map(
        (bookmark) => bookmark.anchorId ?? bookmark.noteId,
      ),
    ),
);
const canvasDirty = ref(false);
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
    const content =
      found.contentType === 'draw'
        ? found.content
        : ensureBlockAnchors(found.content ?? '');
    if (content !== found.content) {
      void noteStore.update(found.id, { content });
    }
    note.value = { ...found, content };
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

watch(
  () => note.value?.id,
  () => {
    tocItems.value = [];
    tocReady.value =
      note.value?.contentType === 'draw' || !note.value?.content?.trim();
  },
);

function handleTocUpdate(items: typeof tocItems.value) {
  tocItems.value = items;
  tocReady.value = true;
}

function handleBookmarkToggle(payload: { anchorId: string; title: string }) {
  if (!note.value) return;
  void bookmarkStore.toggleAnchorBookmark(
    'note',
    note.value.id,
    payload.anchorId,
    payload.title,
  );
}

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
  const content = ensureBlockAnchors(newContent);
  noteContent.value = content;
  if (note.value) {
    noteStore.update(note.value.id, { content });
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
      case 'party':
      case 'monster':
      case 'encounter':
        exists = !!featureStores.get(mention.kind, mention.id);
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
      content:
        draft.contentType === 'draw'
          ? draft.content
          : ensureBlockAnchors(draft.content ?? ''),
      contentType: draft.contentType,
      tags: draft.tags,
      moduleIds: draft.moduleIds,
      typeId: draft.typeId,
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
  if (!features.help || !editState.isEditMode || editState.isVisualMode)
    return [];

  return [
    {
      color: 'primary',
      title: 'markdownEditor.formattingHelp',
      icon: IconHelp,
      href: helpHref('reference/markdown', getHelpLocale(locale.value)),
      target: '_blank',
      rel: 'noopener noreferrer',
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
  await mentionsStore.load();
  await bookmarkStore.load();

  rightDrawer.set({
    component: NoteViewSidebar,
    props: {
      note,
      editState,
      onSetEditMode: setEditMode,
      tocItems,
      tocReady,
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
      <EntityContentSurface v-if="!editState.isEditMode">
        <NoteCanvas
          v-if="note?.contentType === 'draw'"
          :model-value="noteContent"
          readonly
        />
        <MilkdownView
          v-else
          :taskCheckboxEnabled="true"
          :enableMentionModal="true"
          :content="noteContent"
          :bookmarked-ids="bookmarkedAnchorIds"
          @update:content="handleMarkdownContentChange"
          @toc-update="handleTocUpdate"
          @bookmark-toggle="handleBookmarkToggle"
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
</template>
