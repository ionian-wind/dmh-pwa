<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import type { Party } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { useFeatureStores } from '@/composables/useFeatureStores';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import type { MapEntityRef } from '@/maps/types';
import { alert } from '@/dialogs';
import { IconHelp } from '@tabler/icons-vue';

const { t, locale } = useI18n();
const featureStores = useFeatureStores();

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
});

const isWYSIWYGMode = ref(true);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

const editorTabs = useEntityEditorTabs();

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
      };
    } else {
      editedParty.value = {
        name: '',
        description: '',
        characters: [],
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
          v-if="featureStores.has('character')"
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
          v-if="!isWYSIWYGMode && features.help"
          flat
          round
          class="party-help-button"
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
