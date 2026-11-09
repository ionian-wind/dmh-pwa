<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import type { Pawn } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import EntityPicturePicker from '@/components/common/EntityPicturePicker.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { deleteFileIfUnreferenced } from '@/utils/files';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import { useFeatureStores } from '@/composables/useFeatureStores';
import type { MapEntityRef } from '@/maps/types';
import { alert } from '@/dialogs';

const { t, locale } = useI18n();

const props = defineProps<{
  pawn: Pawn | null;
  isOpen: boolean;
  useModalStack?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', pawn: Pawn): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}>();

const featureStores = useFeatureStores();
const relations = useEntityLinkRelations();

const blankPawn = (): Pawn => ({
  id: '',
  name: '',
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const editedPawn = ref<Pawn>(blankPawn());
const isEditing = computed(() => !!props.pawn?.id);
const isWYSIWYGMode = ref(true);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);
const originalPictureId = ref(props.pawn?.picture ?? '');
const picture = computed({
  get: () => editedPawn.value.picture ?? '',
  set: (value: string) => {
    editedPawn.value.picture = value;
  },
});

const editorTabs = useEntityEditorTabs();

const notes = computed({
  get: () => editedPawn.value.notes ?? '',
  set: (value: string) => {
    editedPawn.value.notes = value;
  },
});

const pawnLinks = computed<MapEntityRef[]>(() => {
  const id = editedPawn.value.id;
  return [
    ...(id
      ? relations
          .getLinkedIds('pawn', id, 'note')
          .map((noteId) => ({ kind: 'note' as const, id: noteId }))
      : []),
    ...(id
      ? relations.getLinkedIds('pawn', id, 'encounter').map((encounterId) => ({
          kind: 'encounter' as const,
          id: encounterId,
        }))
      : []),
    ...(id
      ? relations.getLinkedIds('pawn', id, 'location').map((locationId) => ({
          kind: 'location' as const,
          id: locationId,
        }))
      : []),
  ];
});

async function setPawnLinks(
  kind: 'note' | 'encounter' | 'location',
  links: MapEntityRef[],
) {
  if (!editedPawn.value.id) return;
  await relations.setLinkedIds(
    'pawn',
    editedPawn.value.id,
    kind,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

watch(
  () => props.pawn,
  (newPawn) => {
    if (newPawn) {
      editedPawn.value = { ...newPawn };
    } else {
      editedPawn.value = blankPawn();
    }
    originalPictureId.value = newPawn?.picture ?? '';
  },
  { immediate: true, deep: true },
);

watch(
  () => props.isOpen,
  (open) => {
    if (open && !props.pawn) {
      editedPawn.value = blankPawn();
    } else if (!open) {
      resetForm();
    }
  },
);

const resetForm = () => {
  editedPawn.value = blankPawn();
  isWYSIWYGMode.value = true;
};

const savePawn = async () => {
  if (!editedPawn.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }
  if (markdownEditorRef.value?.getMarkdown) {
    editedPawn.value.notes = markdownEditorRef.value.getMarkdown();
  }
  emit('submit', { ...editedPawn.value });
  resetForm();
};

const closeEditor = () => {
  const currentPicture = editedPawn.value.picture;
  if (currentPicture && currentPicture !== originalPictureId.value) {
    void deleteFileIfUnreferenced(currentPicture);
  }
  resetForm();
  emit('cancel');
};

function handleDelete() {
  if (props.pawn) {
    const currentPicture = editedPawn.value.picture;
    if (currentPicture && currentPicture !== originalPictureId.value) {
      void deleteFileIfUnreferenced(currentPicture);
    }
    emit('delete', props.pawn.id);
  }
}

onMounted(async () => {
  await featureStores.load(['encounter', 'location']);
});
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="isOpen"
    :title="isEditing ? t('pawns.edit') : t('pawns.create')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!pawn"
    :showExpand="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="pawn-editor-modal"
    @submit="savePawn"
    @delete="handleDelete"
    @cancel="closeEditor"
  >
    <template #main>
      <EntityInlineEditor
        v-model:title="editedPawn.name"
        :title-placeholder="t('pawns.fields.name')"
      >
        <EntityPicturePicker v-model="picture" />
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="notes"
          :is-visual-mode="isWYSIWYGMode"
          :entity-id="editedPawn.id"
          entity-type="pawn"
          :placeholder="t('common.notes')"
        />
      </EntityInlineEditor>
    </template>

    <template #links>
      <div class="column q-gutter-md">
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

    <template #footer>
      <div class="q-mr-auto row items-center q-gutter-sm">
        <QToggle left-label v-model="isWYSIWYGMode">
          {{ t('markdownEditor.visualMode') }}
        </QToggle>
        <QBtn
          v-if="!isWYSIWYGMode && features.help"
          flat
          round
          class="pawn-help-button"
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
  </BaseModal>
</template>
