<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import { useCharacterStore } from '@/stores/characters';
import { useMentionsStore } from '@/utils/storage';
import type { PlayerCharacter } from '@/types';
import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import EntityContentSurface from '@/components/common/EntityContentSurface.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import CharacterViewSidebar from '@/characters/CharacterViewSidebar.vue';
import { IconHelp } from '@tabler/icons-vue';
import { useEntityViewTabs } from '@/components/common/entityViewTabs';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { alert, confirm } from '@/dialogs';
import { useEntityEditMode } from '@/composables/useEntityEditMode';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import { useFeatureStores } from '@/composables/useFeatureStores';
import { useRightDrawer } from '@/composables/useLayout';
import type { MapEntityRef } from '@/maps/types';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const characterStore = useCharacterStore();
const featureStores = useFeatureStores();
const mentionsStore = useMentionsStore();
const relations = useEntityLinkRelations();

const character = ref<PlayerCharacter | null>(null);
const activeTab = ref('main');
const viewTabs = useEntityViewTabs();
const editorTabs = useEntityEditorTabs();
const isLoaded = computed(() => characterStore.isLoaded);
const notFound = computed(() => isLoaded.value && !character.value);
const validationError = ref<string | null>(null);
const isDeleting = ref(false);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

function updateCharacterFromStore() {
  if (!characterStore.isLoaded) {
    return;
  }
  const found = characterStore.getById(route.params.id as string);
  if (found) {
    character.value = found as PlayerCharacter;
  } else if (!isDeleting.value) {
    router.push('/characters');
  }
}

watch(
  [() => characterStore.items, () => characterStore.isLoaded],
  updateCharacterFromStore,
  { immediate: true },
);

const { editState, setEditMode, discardDraft } =
  useEntityEditMode<PlayerCharacter>({
    source: character,
    clone: (source) => ({
      ...source,
    }),
    isDirty: (draft, source) =>
      draft.name !== source.name ||
      (draft.notes ?? '') !== (source.notes ?? ''),
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

const characterLinks = computed<MapEntityRef[]>(() => {
  const id = character.value?.id;
  if (!id) return [];
  return [
    ...relations
      .getLinkedIds('character', id, 'note')
      .map((noteId) => ({ kind: 'note' as const, id: noteId })),
    ...relations
      .getLinkedIds('character', id, 'party')
      .map((partyId) => ({ kind: 'party' as const, id: partyId })),
    ...relations
      .getLinkedIds('character', id, 'location')
      .map((locationId) => ({ kind: 'location' as const, id: locationId })),
  ];
});

async function setCharacterLinks(
  kind: 'note' | 'party' | 'location',
  links: MapEntityRef[],
) {
  if (!character.value) return;
  await relations.setLinkedIds(
    'character',
    character.value.id,
    kind,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

function handleNotesChange(notes: string) {
  if (character.value) {
    void characterStore.update(character.value.id, { notes });
  }
}

async function prepareDraft(draft: PlayerCharacter): Promise<boolean> {
  if (markdownEditorRef.value?.getMarkdown) {
    draft.notes = markdownEditorRef.value.getMarkdown();
  }
  if (!draft.name?.trim()) {
    activeTab.value = 'main';
    await alert(t('characterEditor.nameRequired'));
    return false;
  }
  validationError.value = null;
  return true;
}

async function persistDraft(draft: PlayerCharacter): Promise<boolean> {
  if (!character.value) return false;
  try {
    await characterStore.update(character.value.id, {
      name: draft.name,
      notes: draft.notes,
    });
  } catch (error) {
    activeTab.value = 'main';
    validationError.value =
      error instanceof Error ? error.message : String(error);
    return false;
  }
  updateCharacterFromStore();
  return true;
}

const characterTitle = computed(() => character.value?.name || '');

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
  if (!character.value) return false;
  if (
    !(await confirm(t('common.confirmDelete', { title: character.value.name })))
  ) {
    return false;
  }
  isDeleting.value = true;
  discardDraft();
  await characterStore.remove(character.value.id);
  return true;
};

const rightDrawer = useRightDrawer();

onMounted(async () => {
  await Promise.all([
    characterStore.load(),
    mentionsStore.load(),
    featureStores.load(['party', 'location', 'note']),
  ]);

  rightDrawer.set({
    component: CharacterViewSidebar,
    props: {
      character,
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
    :entity="character"
    entity-name="characters.title"
    list-route="/characters"
    :on-delete="handleDelete"
    :header-show-edit="false"
    :header-show-delete="editState.isEditMode"
    :is-editing="editState.isEditMode"
    :title="editState.isEditMode ? '' : characterTitle"
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
          :content="character?.notes || ''"
          @update:content="handleNotesChange"
        />
      </EntityContentSurface>

      <EntityInlineEditor
        v-else
        v-model:title="draftName"
        :title-placeholder="t('characters.fields.name')"
        :validation-error="validationError"
      >
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="draftNotes"
          :is-visual-mode="editState.isVisualMode"
          :entity-id="editState.draft?.id || ''"
          entity-type="character"
          :placeholder="t('common.notes')"
        />
      </EntityInlineEditor>
    </template>

    <template #links>
      <EntityViewLinks v-if="!editState.isEditMode" :links="characterLinks" />
      <div v-else class="column q-gutter-md">
        <EntitiesLinking
          v-if="featureStores.has('note')"
          kind="note"
          :model-value="characterLinks"
          @update:model-value="(links) => setCharacterLinks('note', links)"
        />
        <EntitiesLinking
          v-if="featureStores.has('party')"
          kind="party"
          :model-value="characterLinks"
          @update:model-value="(links) => setCharacterLinks('party', links)"
        />
        <EntitiesLinking
          v-if="featureStores.has('location')"
          kind="location"
          :model-value="characterLinks"
          @update:model-value="(links) => setCharacterLinks('location', links)"
        />
      </div>
    </template>
  </BaseEntityTabView>
</template>
