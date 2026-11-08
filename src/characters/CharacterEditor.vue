<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { PlayerCharacter, UUID } from '@/types';
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
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import { alert } from '@/dialogs';
import { IconHelp } from '@tabler/icons-vue';

const props = withDefaults(
  defineProps<{
    character?: PlayerCharacter | null;
    isOpen: boolean;
    useModalStack?: boolean;
    partyId?: UUID;
  }>(),
  {
    character: null,
  },
);

const emit = defineEmits<{
  (e: 'submit', character: PlayerCharacter): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}>();

const { t, locale } = useI18n();
const featureStores = useFeatureStores();
const relations = useEntityLinkRelations();

const blankCharacter = (): PlayerCharacter => ({
  id: '',
  name: '',
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const editedCharacter = ref<PlayerCharacter>(
  props.character ? { ...props.character } : blankCharacter(),
);
const isEditing = computed(() => !!(props.character && props.character.id));
const isWYSIWYGMode = ref(true);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);
const originalPictureId = ref(props.character?.picture ?? '');
const characterPicture = computed({
  get: () => editedCharacter.value.picture ?? '',
  set: (value: string) => {
    editedCharacter.value.picture = value;
  },
});

const tabs = useEntityEditorTabs();

const characterNotes = computed({
  get: () => editedCharacter.value.notes ?? '',
  set: (value: string) => {
    editedCharacter.value.notes = value;
  },
});

const characterLinks = computed<MapEntityRef[]>(() => {
  const id = editedCharacter.value.id;
  return [
    ...(id
      ? relations
          .getLinkedIds('character', id, 'note')
          .map((noteId) => ({ kind: 'note' as const, id: noteId }))
      : []),
    ...(id
      ? relations
          .getLinkedIds('character', id, 'party')
          .map((partyId) => ({ kind: 'party' as const, id: partyId }))
      : []),
    ...(id
      ? relations
          .getLinkedIds('character', id, 'location')
          .map((locationId) => ({ kind: 'location' as const, id: locationId }))
      : []),
  ];
});

async function setCharacterLinks(
  kind: 'note' | 'party' | 'location',
  links: MapEntityRef[],
) {
  if (!editedCharacter.value.id) return;
  await relations.setLinkedIds(
    'character',
    editedCharacter.value.id,
    kind,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

onMounted(async () => {
  await featureStores.load(['party', 'location']);
});

watch(
  () => props.character,
  (newChar) => {
    editedCharacter.value = newChar ? { ...newChar } : blankCharacter();
    originalPictureId.value = newChar?.picture ?? '';
  },
);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) resetForm();
  },
);

function resetForm() {
  editedCharacter.value = blankCharacter();
  isWYSIWYGMode.value = true;
}

function discardPicture() {
  const picture = editedCharacter.value.picture;
  if (picture && picture !== originalPictureId.value) {
    void deleteFileIfUnreferenced(picture);
  }
}

async function handleSubmit() {
  if (!editedCharacter.value.name) {
    await alert(t('characterEditor.nameRequired'));
    return;
  }
  if (markdownEditorRef.value?.getMarkdown) {
    editedCharacter.value.notes = markdownEditorRef.value.getMarkdown();
  }
  emit('submit', { ...editedCharacter.value });
  resetForm();
}

function handleCancel() {
  discardPicture();
  resetForm();
  emit('cancel');
}

function handleDelete() {
  if (props.character) {
    const picture = editedCharacter.value.picture;
    if (picture && picture !== originalPictureId.value) {
      void deleteFileIfUnreferenced(picture);
    }
    emit('delete', props.character.id);
  }
}
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="isOpen"
    :title="isEditing ? t('characters.edit') : t('characters.create')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!character"
    :showExpand="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="tabs"
    modalId="character-editor"
    @submit="handleSubmit"
    @delete="handleDelete"
    @cancel="handleCancel"
  >
    <template #main>
      <EntityInlineEditor
        v-model:title="editedCharacter.name"
        :title-placeholder="t('characters.fields.name')"
      >
        <EntityPicturePicker v-model="characterPicture" />
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="characterNotes"
          :is-visual-mode="isWYSIWYGMode"
          :entity-id="editedCharacter.id"
          entity-type="character"
          :placeholder="t('common.notes')"
        />
      </EntityInlineEditor>
    </template>

    <template #links>
      <div class="column q-gutter-md">
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

    <template #footer>
      <div class="q-mr-auto row items-center q-gutter-sm">
        <QToggle left-label v-model="isWYSIWYGMode">
          {{ t('markdownEditor.visualMode') }}
        </QToggle>
        <QBtn
          v-if="!isWYSIWYGMode && features.help"
          flat
          round
          class="character-help-button"
          :title="t('markdownEditor.formattingHelp')"
          :aria-label="t('markdownEditor.formattingHelp')"
          :href="helpHref('reference/markdown', getHelpLocale(locale))"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconHelp />
        </QBtn>
      </div>
    </template>
  </BaseModal>
</template>
