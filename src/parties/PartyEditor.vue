<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Party } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import MarkdownHelpDialog from '@/components/common/MarkdownHelpDialog.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';
import { alert } from '@/dialogs';
import { IconHelp } from '@tabler/icons-vue';

const { t } = useI18n();

const props = defineProps<{
  party: Party | null;
  isOpen: boolean;
  useModalStack?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', party: Party): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}>();

type PartyForm = Omit<Party, 'id' | 'createdAt' | 'updatedAt'>;

const editedParty = ref<PartyForm>({
  name: '',
  description: '',
  characters: [],
  moduleIds: [],
});

const isWYSIWYGMode = ref(true);
const isHelpOpen = ref(false);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

const editorTabs = useEntityEditorTabs();

const linkedModules = computed<MapEntityRef[]>(() =>
  (editedParty.value.moduleIds ?? []).map((id) => ({ kind: 'module', id })),
);

const linkedCharacters = computed<MapEntityRef[]>(() =>
  (editedParty.value.characters ?? []).map((id) => ({
    kind: 'character',
    id,
  })),
);

const description = computed({
  get: () => editedParty.value.description ?? '',
  set: (value: string) => {
    editedParty.value.description = value;
  },
});

function setLinkedModules(links: MapEntityRef[]) {
  editedParty.value.moduleIds = links.map((link) => link.id);
}

function setLinkedCharacters(links: MapEntityRef[]) {
  editedParty.value.characters = links.map((link) => link.id);
}

watch(
  () => props.party,
  (newParty) => {
    if (newParty) {
      editedParty.value = {
        name: newParty.name,
        description: newParty.description ?? '',
        characters: newParty.characters ?? [],
        moduleIds: newParty.moduleIds ?? [],
      };
    } else {
      editedParty.value = {
        name: '',
        description: '',
        characters: [],
        moduleIds: [],
      };
    }
  },
  { immediate: true },
);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) resetForm();
  },
);

function resetForm() {
  editedParty.value = {
    name: '',
    description: '',
    characters: [],
    moduleIds: [],
  };
  isWYSIWYGMode.value = true;
}

const handleSubmit = async () => {
  if (!editedParty.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }
  if (markdownEditorRef.value?.getMarkdown) {
    editedParty.value.description = markdownEditorRef.value.getMarkdown();
  }
  // Ensure moduleIds is always an array of strings
  editedParty.value.moduleIds = (editedParty.value.moduleIds || [])
    .map((id: any) => (typeof id === 'string' ? id : id?.id || ''))
    .filter(Boolean);
  emit('submit', {
    ...editedParty.value,
    id: props.party?.id ?? '',
    createdAt: props.party?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
  resetForm();
};

const handleCancel = () => {
  resetForm();
  emit('cancel');
};

function handleDelete() {
  if (props.party) emit('delete', props.party.id);
}
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="isOpen"
    :title="party ? t('parties.edit') : t('parties.create')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!party"
    :showExpand="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="party-editor-modal"
    @submit="handleSubmit"
    @delete="handleDelete"
    @cancel="handleCancel"
  >
    <template #main>
      <EntityInlineEditor
        v-model:title="editedParty.name"
        :title-placeholder="t('parties.fields.name')"
      >
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="description"
          :is-visual-mode="isWYSIWYGMode"
          :entity-id="party?.id || ''"
          entity-type="party"
          :placeholder="t('parties.fields.description')"
        />
      </EntityInlineEditor>
    </template>

    <template #links>
      <div class="column q-gutter-md">
        <EntitiesLinking
          kind="module"
          :model-value="linkedModules"
          @update:model-value="setLinkedModules"
        />
        <EntitiesLinking
          kind="character"
          :model-value="linkedCharacters"
          @update:model-value="setLinkedCharacters"
        />
      </div>
    </template>

    <template #footer>
      <div class="q-mr-auto row items-center q-gutter-sm">
        <QToggle left-label v-model="isWYSIWYGMode">
          {{ t('markdownEditor.visualMode') }}
        </QToggle>
        <QBtn
          v-if="!isWYSIWYGMode"
          flat
          round
          class="party-help-button"
          :title="t('markdownEditor.formattingHelp')"
          :aria-label="t('markdownEditor.formattingHelp')"
          @click="isHelpOpen = true"
        >
          <IconHelp />
        </QBtn>
      </div>
    </template>
  </BaseModal>

  <MarkdownHelpDialog v-model:is-open="isHelpOpen" />
</template>
