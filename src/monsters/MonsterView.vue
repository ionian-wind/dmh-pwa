<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMonsterStore } from '@/stores/monsters';
import type { Monster } from '@/types';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import EntityContentSurface from '@/components/common/EntityContentSurface.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import Markdown from '@/components/common/Markdown.vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';
import { useI18n } from 'vue-i18n';
import MonsterViewSidebar from '@/monsters/MonsterViewSidebar.vue';
import { alert, confirm } from '@/dialogs';
import { useEntityEditMode } from '@/composables/useEntityEditMode';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import { useFeatureStores } from '@/composables/useFeatureStores';
import { useRightDrawer } from '@/composables/useLayout';
import { IconHelp } from '@tabler/icons-vue';

const route = useRoute();
const router = useRouter();
const monsterStore = useMonsterStore();
const featureStores = useFeatureStores();
const relations = useEntityLinkRelations();
const { t, locale } = useI18n();

const monster = ref<Monster | null>(null);
const activeTab = ref('main');
const viewTabs = useEntityViewTabs();
const editorTabs = useEntityEditorTabs();
const notFound = computed(() => monsterStore.isLoaded && !monster.value);
const validationError = ref<string | null>(null);
const isDeleting = ref(false);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

function updateMonsterFromStore() {
  if (!monsterStore.isLoaded) return;
  const found = monsterStore.getById(route.params.id as string);
  if (found) {
    monster.value = found;
  } else if (!isDeleting.value) {
    router.push('/monsters');
  }
}

watch(
  [() => monsterStore.items, () => monsterStore.isLoaded],
  updateMonsterFromStore,
  { immediate: true },
);

const { editState, setEditMode, discardDraft } = useEntityEditMode<Monster>({
  source: monster,
  clone: (source) => ({
    ...source,
    moduleIds: [...(source.moduleIds ?? [])],
  }),
  isDirty: (draft, source) =>
    draft.name !== source.name ||
    (draft.notes ?? '') !== (source.notes ?? '') ||
    !arraysEqual(draft.moduleIds, source.moduleIds),
  onEnter: () => {
    validationError.value = null;
  },
  onDiscard: () => {
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

const monsterTitle = computed(() => monster.value?.name || '');

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

const monsterLinks = computed<MapEntityRef[]>(() => {
  const id = monster.value?.id;
  if (!id) return [];
  return [
    ...(editState.draft?.moduleIds ?? monster.value?.moduleIds ?? []).map(
      (moduleId) => ({ kind: 'module' as const, id: moduleId }),
    ),
    ...relations
      .getLinkedIds('monster', id, 'encounter')
      .map((encounterId) => ({ kind: 'encounter' as const, id: encounterId })),
    ...relations
      .getLinkedIds('monster', id, 'location')
      .map((locationId) => ({ kind: 'location' as const, id: locationId })),
  ];
});

function arraysEqual(a: string[] = [], b: string[] = []) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

async function setMonsterLinks(
  kind: 'module' | 'encounter' | 'location',
  links: MapEntityRef[],
) {
  if (!monster.value) return;
  if (kind === 'module') {
    if (editState.draft) {
      editState.draft.moduleIds = links
        .filter((link) => link.kind === 'module')
        .map((link) => link.id);
    }
    return;
  }
  await relations.setLinkedIds(
    'monster',
    monster.value.id,
    kind,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

function handleNotesChange(notes: string) {
  if (monster.value) {
    void monsterStore.update(monster.value.id, { notes });
  }
}

async function prepareDraft(draft: Monster): Promise<boolean> {
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

async function persistDraft(draft: Monster): Promise<boolean> {
  if (!monster.value) return false;
  try {
    await monsterStore.update(monster.value.id, {
      name: draft.name,
      notes: draft.notes,
      moduleIds: draft.moduleIds,
    });
  } catch (error) {
    activeTab.value = 'main';
    validationError.value =
      error instanceof Error ? error.message : String(error);
    return false;
  }
  updateMonsterFromStore();
  return true;
}

const headerButtons = computed(() => {
  if (!editState.isEditMode || editState.isVisualMode) return [];
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
  if (!monster.value) return false;
  if (
    !(await confirm(t('common.confirmDelete', { title: monster.value.name })))
  ) {
    return false;
  }
  isDeleting.value = true;
  discardDraft();
  await monsterStore.remove(monster.value.id);
  return true;
};

const rightDrawer = useRightDrawer();

onMounted(async () => {
  await Promise.all([
    monsterStore.load(),
    featureStores.load(['encounter', 'location']),
  ]);
  rightDrawer.set({
    component: MonsterViewSidebar,
    props: {
      monster,
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
    :entity="monster"
    entity-name="monsters.title"
    list-route="/monsters"
    :on-delete="handleDelete"
    :header-show-edit="false"
    :header-show-delete="editState.isEditMode"
    :is-editing="editState.isEditMode"
    :title="editState.isEditMode ? '' : monsterTitle"
    :not-found="notFound"
    :header-buttons="headerButtons"
    :tabs="tabs"
    v-model="activeTab"
  >
    <template #main>
      <EntityContentSurface v-if="!editState.isEditMode">
        <Markdown
          :taskCheckboxEnabled="true"
          :enableMentionModal="true"
          :content="monster?.notes || ''"
          @update:content="handleNotesChange"
        />
      </EntityContentSurface>

      <EntityInlineEditor
        v-else
        v-model:title="draftName"
        :title-placeholder="t('monsters.fields.name')"
        :validation-error="validationError"
      >
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="draftNotes"
          :is-visual-mode="editState.isVisualMode"
          :entity-id="editState.draft?.id || ''"
          entity-type="monster"
          :placeholder="t('common.notes')"
        />
      </EntityInlineEditor>
    </template>

    <template #links>
      <EntityViewLinks v-if="!editState.isEditMode" :links="monsterLinks" />
      <div v-else class="column q-gutter-md">
        <EntitiesLinking
          v-if="featureStores.has('module')"
          kind="module"
          :model-value="monsterLinks"
          @update:model-value="(links) => setMonsterLinks('module', links)"
        />
        <EntitiesLinking
          v-if="featureStores.has('encounter')"
          kind="encounter"
          :model-value="monsterLinks"
          @update:model-value="(links) => setMonsterLinks('encounter', links)"
        />
        <EntitiesLinking
          v-if="featureStores.has('location')"
          kind="location"
          :model-value="monsterLinks"
          @update:model-value="(links) => setMonsterLinks('location', links)"
        />
      </div>
    </template>
  </BaseEntityTabView>
</template>
