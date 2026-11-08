<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePawnStore } from '@/stores/pawns';
import type { Pawn } from '@/types';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import EntityContentSurface from '@/components/common/EntityContentSurface.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import PawnViewSidebar from '@/pawns/PawnViewSidebar.vue';
import { alert, confirm } from '@/dialogs';
import { useEntityEditMode } from '@/composables/useEntityEditMode';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import { useFeatureStores } from '@/composables/useFeatureStores';
import { useRightDrawer } from '@/composables/useLayout';
import { deleteFileIfUnreferenced } from '@/utils/files';
import { IconHelp } from '@tabler/icons-vue';

const route = useRoute();
const router = useRouter();
const pawnStore = usePawnStore();
const featureStores = useFeatureStores();
const relations = useEntityLinkRelations();
const { t, locale } = useI18n();

const pawn = ref<Pawn | null>(null);
const activeTab = ref('main');
const viewTabs = useEntityViewTabs();
const editorTabs = useEntityEditorTabs();
const notFound = computed(() => pawnStore.isLoaded && !pawn.value);
const validationError = ref<string | null>(null);
const isDeleting = ref(false);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

function updatePawnFromStore() {
  if (!pawnStore.isLoaded) return;
  const found = pawnStore.getById(route.params.id as string);
  if (found) {
    pawn.value = found;
  } else if (!isDeleting.value) {
    router.push('/pawns');
  }
}

watch([() => pawnStore.items, () => pawnStore.isLoaded], updatePawnFromStore, {
  immediate: true,
});

const { editState, setEditMode, discardDraft } = useEntityEditMode<Pawn>({
  source: pawn,
  clone: (source) => ({
    ...source,
  }),
  isDirty: (draft, source) =>
    draft.name !== source.name ||
    (draft.notes ?? '') !== (source.notes ?? '') ||
    (draft.picture ?? '') !== (source.picture ?? ''),
  onEnter: () => {
    validationError.value = null;
  },
  onDiscard: (draft) => {
    if (draft?.picture && draft.picture !== (pawn.value?.picture ?? '')) {
      void deleteFileIfUnreferenced(draft.picture);
    }
    validationError.value = null;
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

const pawnTitle = computed(() => pawn.value?.name || '');

const draftName = computed({
  get: () => editState.draft?.name ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.name = value;
  },
});

const draftNotes = computed({
  get: () => editState.draft?.notes ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.notes = value;
  },
});

const pawnLinks = computed<MapEntityRef[]>(() => {
  const id = pawn.value?.id;
  if (!id) return [];
  return [
    ...relations
      .getLinkedIds('pawn', id, 'note')
      .map((noteId) => ({ kind: 'note' as const, id: noteId })),
    ...relations
      .getLinkedIds('pawn', id, 'encounter')
      .map((encounterId) => ({ kind: 'encounter' as const, id: encounterId })),
    ...relations
      .getLinkedIds('pawn', id, 'location')
      .map((locationId) => ({ kind: 'location' as const, id: locationId })),
  ];
});

async function setPawnLinks(
  kind: 'note' | 'encounter' | 'location',
  links: MapEntityRef[],
) {
  if (!pawn.value) return;
  await relations.setLinkedIds(
    'pawn',
    pawn.value.id,
    kind,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

function handleNotesChange(notes: string) {
  if (pawn.value) {
    void pawnStore.update(pawn.value.id, { notes });
  }
}

async function prepareDraft(draft: Pawn): Promise<boolean> {
  if (markdownEditorRef.value?.getMarkdown) {
    draft.notes = markdownEditorRef.value.getMarkdown();
  }
  if (!draft.name?.trim()) {
    activeTab.value = 'main';
    await alert(t('common.nameRequired'));
    return false;
  }
  validationError.value = null;
  return true;
}

async function persistDraft(draft: Pawn): Promise<boolean> {
  if (!pawn.value) return false;
  const previousPicture = pawn.value.picture ?? '';
  try {
    await pawnStore.update(pawn.value.id, {
      name: draft.name,
      notes: draft.notes,
      picture: draft.picture,
    });
  } catch (error) {
    activeTab.value = 'main';
    validationError.value =
      error instanceof Error ? error.message : String(error);
    return false;
  }
  if (previousPicture && previousPicture !== (draft.picture ?? '')) {
    await deleteFileIfUnreferenced(previousPicture);
  }
  updatePawnFromStore();
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
  if (!pawn.value) return false;
  if (!(await confirm(t('common.confirmDelete', { title: pawn.value.name })))) {
    return false;
  }
  isDeleting.value = true;
  discardDraft();
  const picture = pawn.value.picture;
  await pawnStore.remove(pawn.value.id);
  if (picture) await deleteFileIfUnreferenced(picture);
  return true;
};

async function handleDeleteFromSidebar() {
  if (await handleDelete()) await router.push('/pawns');
}

const rightDrawer = useRightDrawer();

onMounted(async () => {
  await Promise.all([
    pawnStore.load(),
    featureStores.load(['encounter', 'location', 'note']),
  ]);
  rightDrawer.set({
    component: PawnViewSidebar,
    props: {
      pawn,
      editState,
      onSetEditMode: setEditMode,
      onDelete: handleDeleteFromSidebar,
    },
  });
});

onBeforeUnmount(() => {
  rightDrawer.clear();
});
</script>

<template>
  <BaseEntityTabView
    :entity="pawn"
    entity-name="pawns.title"
    list-route="/pawns"
    :on-delete="handleDelete"
    :header-show-edit="false"
    :header-show-delete="false"
    :is-editing="editState.isEditMode"
    :title="editState.isEditMode ? '' : pawnTitle"
    :not-found="notFound"
    :header-buttons="headerButtons"
    :tabs="tabs"
    v-model="activeTab"
  >
    <template #main>
      <EntityContentSurface v-if="!editState.isEditMode">
        <MilkdownView
          :taskCheckboxEnabled="true"
          :enableMentionModal="true"
          :content="pawn?.notes || ''"
          @update:content="handleNotesChange"
        />
      </EntityContentSurface>

      <EntityInlineEditor
        v-else
        v-model:title="draftName"
        :title-placeholder="t('pawns.fields.name')"
        :validation-error="validationError"
      >
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="draftNotes"
          :is-visual-mode="editState.isVisualMode"
          :entity-id="editState.draft?.id || ''"
          entity-type="pawn"
          :placeholder="t('common.notes')"
        />
      </EntityInlineEditor>
    </template>

    <template #links>
      <EntityViewLinks v-if="!editState.isEditMode" :links="pawnLinks" />
      <div v-else class="column q-gutter-md">
        <EntitiesLinking
          v-if="featureStores.has('note')"
          kind="note"
          :model-value="pawnLinks"
          @update:model-value="(links) => setPawnLinks('note', links)"
        />
        <EntitiesLinking
          v-if="featureStores.has('encounter')"
          kind="encounter"
          :model-value="pawnLinks"
          @update:model-value="(links) => setPawnLinks('encounter', links)"
        />
        <EntitiesLinking
          v-if="featureStores.has('location')"
          kind="location"
          :model-value="pawnLinks"
          @update:model-value="(links) => setPawnLinks('location', links)"
        />
      </div>
    </template>
  </BaseEntityTabView>
</template>
