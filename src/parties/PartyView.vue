<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import { useRoute, useRouter } from 'vue-router';

import type { Party } from '@/types';

import { usePartyStore } from '@/stores/parties';

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

import PartyViewSidebar from '@/parties/PartyViewSidebar.vue';
import { alert, confirm } from '@/dialogs';
import { useEntityEditMode } from '@/composables/useEntityEditMode';
import { useFeatureStores } from '@/composables/useFeatureStores';
import { useRightDrawer } from '@/composables/useLayout';
import { IconHelp } from '@tabler/icons-vue';

const route = useRoute();
const router = useRouter();
const partyStore = usePartyStore();
const featureStores = useFeatureStores();
const { t, locale } = useI18n();

const party = ref<Party | null>(null);
const activeTab = ref('main');
const viewTabs = useEntityViewTabs();
const editorTabs = useEntityEditorTabs();
const isLoaded = computed(() => partyStore.isLoaded);
const notFound = computed(() => isLoaded.value && !party.value);
const validationError = ref<string | null>(null);
const isDeleting = ref(false);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

function updatePartyFromStore() {
  if (!partyStore.isLoaded) return;
  const found = partyStore.getById(route.params.id as string);
  if (found) {
    party.value = found;
  } else if (!isDeleting.value) {
    router.push('/parties');
  }
}

watch(
  [() => partyStore.items, () => partyStore.isLoaded],
  updatePartyFromStore,
  {
    immediate: true,
  },
);

const { editState, setEditMode, discardDraft } = useEntityEditMode<Party>({
  source: party,
  clone: (source) => ({
    ...source,
    moduleIds: [...(source.moduleIds ?? [])],
    characters: [...(source.characters ?? [])],
  }),
  isDirty: (draft, source) =>
    draft.name !== source.name ||
    (draft.description ?? '') !== (source.description ?? '') ||
    !arraysEqual(draft.moduleIds, source.moduleIds) ||
    !arraysEqual(draft.characters, source.characters),
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

const partyTitle = computed(() => party.value?.name || '');

const modules = computed(() =>
  (party.value?.moduleIds ?? [])
    .map((id) => featureStores.get('module', id))
    .filter(Boolean),
);

const partyCharacters = computed(() => {
  const current = party.value;
  if (!current) return [];
  return featureStores
    .items('character')
    .filter((character) => current.characters.includes(character.id));
});

const partySubtitle = computed(() => {
  if (!party.value) return '';
  const parts: string[] = [];
  if (modules.value.length > 0) {
    parts.push(
      `Modules: ${modules.value
        .map((module) => module?.name)
        .filter(Boolean)
        .join(', ')}`,
    );
  }
  parts.push(`${partyCharacters.value.length} characters`);
  return parts.join(' • ');
});

const partyLinks = computed<MapEntityRef[]>(() => {
  const source = editState.draft ?? party.value;
  if (!source) return [];
  return [
    ...(source.moduleIds ?? []).map((id) => ({
      kind: 'module' as const,
      id,
    })),
    ...(source.characters ?? []).map((id) => ({
      kind: 'character' as const,
      id,
    })),
  ];
});

const draftName = computed({
  get: () => editState.draft?.name ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.name = value;
  },
});

const draftDescription = computed({
  get: () => editState.draft?.description ?? '',
  set: (value: string) => {
    if (editState.draft) editState.draft.description = value;
  },
});

function arraysEqual(a: string[] = [], b: string[] = []) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function setLinkedModules(links: MapEntityRef[]) {
  if (editState.draft) {
    editState.draft.moduleIds = links
      .filter((link) => link.kind === 'module')
      .map((link) => link.id);
  }
}

function setLinkedCharacters(links: MapEntityRef[]) {
  if (editState.draft) {
    editState.draft.characters = links
      .filter((link) => link.kind === 'character')
      .map((link) => link.id);
  }
}

function handleDescriptionChange(description: string) {
  if (party.value) {
    void partyStore.update(party.value.id, { description });
  }
}

async function prepareDraft(draft: Party): Promise<boolean> {
  if (markdownEditorRef.value?.getMarkdown) {
    draft.description = markdownEditorRef.value.getMarkdown();
  }
  if (!draft.name?.trim()) {
    activeTab.value = 'main';
    await alert(t('common.nameRequired'));
    return false;
  }
  validationError.value = null;
  return true;
}

async function persistDraft(draft: Party): Promise<boolean> {
  if (!party.value) return false;
  try {
    await partyStore.update(party.value.id, {
      name: draft.name,
      description: draft.description,
      moduleIds: draft.moduleIds,
      characters: draft.characters,
    });
  } catch (error) {
    activeTab.value = 'main';
    validationError.value =
      error instanceof Error ? error.message : String(error);
    return false;
  }
  updatePartyFromStore();
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

async function handleDeleteParty() {
  if (!party.value) return false;
  if (
    !(await confirm(t('common.confirmDelete', { title: party.value.name })))
  ) {
    return false;
  }
  isDeleting.value = true;
  discardDraft();
  await partyStore.remove(party.value.id);
  return true;
}

const rightDrawer = useRightDrawer();

onMounted(async () => {
  await Promise.all([
    partyStore.load(),
    featureStores.load(['character', 'module']),
  ]);
  rightDrawer.set({
    component: PartyViewSidebar,
    props: {
      party,
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
    :entity="party"
    entity-name="parties.title"
    list-route="/parties"
    :on-delete="handleDeleteParty"
    :header-show-edit="false"
    :header-show-delete="editState.isEditMode"
    :is-editing="editState.isEditMode"
    :title="editState.isEditMode ? '' : partyTitle"
    :subtitle="editState.isEditMode ? '' : partySubtitle"
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
          :content="party?.description || ''"
          @update:content="handleDescriptionChange"
        />
      </EntityContentSurface>

      <EntityInlineEditor
        v-else
        v-model:title="draftName"
        :title-placeholder="t('parties.fields.name')"
        :validation-error="validationError"
      >
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="draftDescription"
          :is-visual-mode="editState.isVisualMode"
          :entity-id="editState.draft?.id || ''"
          entity-type="party"
          :placeholder="t('parties.fields.description')"
        />
      </EntityInlineEditor>
    </template>

    <template #links>
      <EntityViewLinks v-if="!editState.isEditMode" :links="partyLinks" />
      <div v-else class="column q-gutter-md">
        <EntitiesLinking
          v-if="featureStores.has('module')"
          kind="module"
          :model-value="partyLinks"
          @update:model-value="setLinkedModules"
        />
        <EntitiesLinking
          v-if="featureStores.has('character')"
          kind="character"
          :model-value="partyLinks"
          @update:model-value="setLinkedCharacters"
        />
      </div>
    </template>
  </BaseEntityTabView>
</template>
