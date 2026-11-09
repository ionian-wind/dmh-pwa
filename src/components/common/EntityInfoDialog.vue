<script setup lang="ts">
import { computed, defineAsyncComponent, ref, toValue, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { IconAffiliate, IconEye } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import EntityPicture from '@/components/common/EntityPicture.vue';
import EntityPicturePicker from '@/components/common/EntityPicturePicker.vue';
import MilkdownView from '@/components/common/milkdown/MilkdownView.vue';
import {
  entityRoute,
  getEntityKindOption,
} from '@/components/common/entityLinking/entityRefs';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';
import type { Note } from '@/types';
import { alert } from '@/dialogs';

const EntityViewLinks = defineAsyncComponent(
  () => import('@/components/common/EntityViewLinks.vue'),
);
const EntitiesLinking = defineAsyncComponent(
  () => import('@/components/common/EntitiesLinking.vue'),
);
const NoteOptions = __FEATURE_NOTES__
  ? defineAsyncComponent(() => import('@/notes/NoteOptions.vue'))
  : null;

const LINK_TARGETS: Record<string, MapEntityKind[]> = {
  note: ['party', 'pawn', 'encounter', 'character', 'location'],
  character: ['note', 'party', 'location'],
  pawn: ['note', 'encounter', 'location'],
  party: ['note', 'character', 'location'],
  encounter: ['note', 'pawn', 'location'],
  location: ['note', 'party', 'pawn', 'encounter', 'character', 'playlist'],
  playlist: ['note', 'party', 'pawn', 'encounter', 'character', 'location'],
};

const props = defineProps<{
  isOpen: boolean;
  title: string;
  picture?: string | null;
  notes?: string;
  to?: string;
  entityKind?: string;
  entityId?: string;
}>();

const emit = defineEmits<{
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const router = useRouter();
const relations = useEntityLinkRelations();
const isExpanded = ref(false);
const isEditMode = ref(false);
const isVisualMode = ref(true);
const isSaving = ref(false);
const activeTab = ref('main');
const draft = ref<Record<string, any> | null>(null);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

const option = computed(() =>
  props.entityKind ? getEntityKindOption(props.entityKind) : undefined,
);
const entityStore = computed(() => option.value?.useStore());
const titleField = computed(() => option.value?.titleField ?? 'name');
const openTo = computed(
  () =>
    props.to ??
    (props.entityKind && props.entityId
      ? entityRoute(props.entityKind, props.entityId)
      : undefined),
);

const entity = computed(() => {
  const store = entityStore.value;
  if (!store || !props.entityId) return undefined;

  const byId = store.getById?.(props.entityId);
  if (byId) return byId;

  const items = toValue(store.items as any);
  return Array.isArray(items)
    ? items.find((item) => item.id === props.entityId)
    : undefined;
});

const bodyField = computed(() => {
  const value = entity.value;
  if (!value) return 'description';
  if ('notes' in value) return 'notes';
  if ('description' in value) return 'description';
  if ('content' in value) return 'content';
  return 'description';
});
const supportsPicture = computed(
  () => !!entity.value && 'picture' in entity.value,
);
const canEdit = computed(() => !!props.entityId && !!entityStore.value?.update);
const isNote = computed(() => props.entityKind === 'note');
const noteDraft = computed(() => draft.value as unknown as Note);

const linkKinds = computed<MapEntityKind[]>(() => {
  const kind = props.entityKind as MapEntityKind | undefined;
  if (!kind) return [];
  return (LINK_TARGETS[kind] ?? []).filter(
    (target) => target !== kind && !!getEntityKindOption(target),
  );
});

const linkedRefs = computed<MapEntityRef[]>(() => {
  if (!props.entityKind || !props.entityId) return [];
  return linkKinds.value.flatMap((kind) =>
    relations
      .getLinkedIds(props.entityKind! as any, props.entityId!, kind as any)
      .map((id) => ({ kind, id })),
  );
});

const tabs = computed(() => {
  if (!linkKinds.value.length) return undefined;
  return [
    { name: 'main', title: t('common.main'), icon: IconEye },
    {
      name: 'links',
      title: t('common.linkedEntities'),
      icon: IconAffiliate,
    },
  ];
});

const displayTitle = computed(
  () =>
    draft.value?.[titleField.value] ??
    entity.value?.[titleField.value] ??
    props.title,
);
const displayBody = computed(
  () =>
    draft.value?.[bodyField.value] ??
    entity.value?.[bodyField.value] ??
    props.notes ??
    '',
);
const displayPicture = computed(
  () => draft.value?.picture ?? entity.value?.picture ?? props.picture ?? null,
);

const draftTitle = computed({
  get: () => String(draft.value?.[titleField.value] ?? ''),
  set: (value: string) => {
    if (draft.value) draft.value[titleField.value] = value;
  },
});
const draftBody = computed({
  get: () => String(draft.value?.[bodyField.value] ?? ''),
  set: (value: string) => {
    if (draft.value) draft.value[bodyField.value] = value;
  },
});
const draftPicture = computed({
  get: () => String(draft.value?.picture ?? ''),
  set: (value: string) => {
    if (draft.value) draft.value.picture = value;
  },
});

function openEntity() {
  if (!openTo.value) return;
  emit('cancel');
  void router.push(openTo.value);
}

function startEditing() {
  if (!entity.value) return;
  draft.value = { ...entity.value };
  isVisualMode.value = true;
  isEditMode.value = true;
  activeTab.value = 'main';
}

async function finishEditing() {
  const store = entityStore.value;
  if (!draft.value || !props.entityId || !store?.update) {
    isEditMode.value = false;
    draft.value = null;
    return;
  }

  const title = String(draft.value[titleField.value] ?? '').trim();
  const body = String(draft.value[bodyField.value] ?? '').trim();
  if (props.entityKind === 'note') {
    if (!title && !body) {
      activeTab.value = 'main';
      await alert(t('editor.titleOrContentRequired'));
      return;
    }
  } else if (!title) {
    activeTab.value = 'main';
    await alert(t('common.nameRequired'));
    return;
  }

  if (markdownEditorRef.value?.getMarkdown) {
    draft.value[bodyField.value] = markdownEditorRef.value.getMarkdown();
  }

  const patch: Record<string, unknown> = {
    [titleField.value]: title,
    [bodyField.value]: draft.value[bodyField.value] ?? '',
  };
  if (isNote.value) {
    patch.typeId = draft.value.typeId ?? null;
    patch.tags = [...(draft.value.tags ?? [])];
  }
  if (supportsPicture.value) {
    patch.picture = draft.value.picture ?? '';
  }

  isSaving.value = true;
  try {
    await store.update(props.entityId, patch);
    isEditMode.value = false;
    draft.value = null;
  } catch (error) {
    activeTab.value = 'main';
    await alert(error instanceof Error ? error.message : String(error));
  } finally {
    isSaving.value = false;
  }
}

function setEditMode(value: boolean) {
  if (value) {
    startEditing();
  } else {
    void finishEditing();
  }
}

function handleOptionsUpdate(updated: Note) {
  if (draft.value) {
    Object.assign(draft.value, updated);
  }
}

async function setLinks(kind: MapEntityKind, links: MapEntityRef[]) {
  if (!props.entityKind || !props.entityId) return;
  await relations.setLinkedIds(
    props.entityKind as any,
    props.entityId,
    kind as any,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

async function loadEntity() {
  if (!props.isOpen || !props.entityId) return;
  if (!entity.value) await entityStore.value?.load();
  await Promise.all(
    linkKinds.value.map((kind) =>
      relations.loadFor(props.entityKind! as any, kind as any),
    ),
  );
}

watch(
  () => [props.isOpen, props.entityKind, props.entityId],
  ([open]) => {
    if (!open) {
      isEditMode.value = false;
      draft.value = null;
      activeTab.value = 'main';
      return;
    }
    void loadEntity();
  },
  { immediate: true },
);
</script>

<template>
  <BaseModal
    :is-open="props.isOpen"
    :title="displayTitle"
    modal-id="entity-info-dialog"
    :show-submit="false"
    :show-cancel="true"
    :cancel-label="t('common.close')"
    :use-modal-stack="false"
    :show-expand="true"
    :tabs="tabs"
    v-model:active-tab="activeTab"
    v-model:is-expanded="isExpanded"
    @cancel="emit('cancel')"
  >
    <template v-if="openTo" #header-actions>
      <QBtn
        class="entity-info-open"
        flat
        :title="t('common.open')"
        :aria-label="t('common.open')"
        @click="openEntity"
      >
        <QIcon name="tabler-external-link" size="20px" />
      </QBtn>
    </template>

    <template v-if="isNote && isEditMode" #footer>
      <div
        class="note-dialog-footer-actions q-mr-auto row items-center q-gutter-sm"
      >
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
              <component
                :is="NoteOptions"
                v-if="NoteOptions"
                :note="noteDraft"
                @update:note="handleOptionsUpdate"
              />
            </QCard>
          </QMenu>
        </QBtn>
        <QToggle left-label v-model="isVisualMode">
          {{ t('markdownEditor.visualMode') }}
        </QToggle>
      </div>
    </template>

    <template v-if="canEdit" #footer-center>
      <QBtnGroup class="entity-dialog-mode-switch">
        <QBtn
          class="entity-view-mode"
          color="primary"
          :outline="isEditMode"
          :disable="isSaving"
          :title="t('common.viewMode')"
          :aria-label="t('common.viewMode')"
          :aria-pressed="!isEditMode"
          @click="setEditMode(false)"
        >
          <QIcon name="tabler-eye" size="18px" />
        </QBtn>
        <QBtn
          class="entity-edit-mode"
          color="primary"
          :outline="!isEditMode"
          :disable="isSaving"
          :title="t('common.editMode')"
          :aria-label="t('common.editMode')"
          :aria-pressed="isEditMode"
          @click="setEditMode(true)"
        >
          <QIcon name="tabler-edit" size="18px" />
        </QBtn>
      </QBtnGroup>
    </template>

    <template #main>
      <div v-if="isEditMode" class="entity-info-edit column q-gutter-md">
        <EntityInlineEditor
          v-model:title="draftTitle"
          :title-placeholder="t('common.name')"
        >
          <EntityPicturePicker v-if="supportsPicture" v-model="draftPicture" />
          <EntityMarkdownEditor
            ref="markdownEditorRef"
            v-model="draftBody"
            :is-visual-mode="isVisualMode"
            :entity-id="props.entityId ?? ''"
            :entity-type="props.entityKind ?? ''"
            :placeholder="t('common.description')"
          />
        </EntityInlineEditor>
      </div>

      <div v-else class="entity-info-dialog column items-center q-gutter-md">
        <EntityPicture
          v-if="displayPicture"
          :picture="displayPicture"
          size="240px"
          :alt="displayTitle"
        />
        <div class="entity-info-notes full-width">
          <MilkdownView
            v-if="displayBody"
            :task-checkbox-enabled="true"
            :enable-mention-modal="true"
            :content="displayBody"
          />
          <div v-else class="text-caption text-grey-7">
            {{ t('common.noDescription') }}
          </div>
        </div>
      </div>
    </template>

    <template v-if="tabs" #links>
      <EntityViewLinks v-if="!isEditMode" :links="linkedRefs" />
      <div v-else class="column q-gutter-md">
        <EntitiesLinking
          v-for="kind in linkKinds"
          :key="kind"
          :kind="kind"
          :model-value="linkedRefs"
          @update:model-value="(links) => setLinks(kind, links)"
        />
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.entity-info-dialog {
  padding: 1rem;
}

.entity-info-notes {
  min-width: 0;
}

.entity-info-edit {
  padding: 0.5rem;
}

.entity-dialog-mode-switch :deep(.q-btn) {
  min-width: 44px;
}
</style>
