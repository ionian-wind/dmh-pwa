<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { features } from 'virtual:feature-flags';
import type { Monster } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import { getHelpLocale, helpHref } from '@/helpcenter/links';
import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';
import { useFeatureStores } from '@/composables/useFeatureStores';
import type { MapEntityRef } from '@/maps/types';
import { alert } from '@/dialogs';
import { IconHelp } from '@tabler/icons-vue';

const { t, locale } = useI18n();

const props = defineProps<{
  monster: Monster | null;
  isOpen: boolean;
  useModalStack?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', monster: Monster): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}>();

const featureStores = useFeatureStores();
const relations = useEntityLinkRelations();

const blankMonster = (): Monster => ({
  id: '',
  name: '',
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const editedMonster = ref<Monster>(blankMonster());
const isEditing = computed(() => !!props.monster?.id);
const isWYSIWYGMode = ref(true);
const markdownEditorRef = ref<InstanceType<typeof EntityMarkdownEditor> | null>(
  null,
);

const editorTabs = useEntityEditorTabs();

const notes = computed({
  get: () => editedMonster.value.notes ?? '',
  set: (value: string) => {
    editedMonster.value.notes = value;
  },
});

const monsterLinks = computed<MapEntityRef[]>(() => {
  const id = editedMonster.value.id;
  return [
    ...(id
      ? relations
          .getLinkedIds('monster', id, 'note')
          .map((noteId) => ({ kind: 'note' as const, id: noteId }))
      : []),
    ...(id
      ? relations
          .getLinkedIds('monster', id, 'encounter')
          .map((encounterId) => ({
            kind: 'encounter' as const,
            id: encounterId,
          }))
      : []),
    ...(id
      ? relations.getLinkedIds('monster', id, 'location').map((locationId) => ({
          kind: 'location' as const,
          id: locationId,
        }))
      : []),
  ];
});

async function setMonsterLinks(
  kind: 'note' | 'encounter' | 'location',
  links: MapEntityRef[],
) {
  if (!editedMonster.value.id) return;
  await relations.setLinkedIds(
    'monster',
    editedMonster.value.id,
    kind,
    links.filter((link) => link.kind === kind).map((link) => link.id),
  );
}

watch(
  () => props.monster,
  (newMonster) => {
    if (newMonster) {
      editedMonster.value = { ...newMonster };
    } else {
      editedMonster.value = blankMonster();
    }
  },
  { immediate: true, deep: true },
);

watch(
  () => props.isOpen,
  (open) => {
    if (open && !props.monster) {
      editedMonster.value = blankMonster();
    } else if (!open) {
      resetForm();
    }
  },
);

const resetForm = () => {
  editedMonster.value = blankMonster();
  isWYSIWYGMode.value = true;
};

const saveMonster = async () => {
  if (!editedMonster.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }
  if (markdownEditorRef.value?.getMarkdown) {
    editedMonster.value.notes = markdownEditorRef.value.getMarkdown();
  }
  emit('submit', { ...editedMonster.value });
  resetForm();
};

const closeEditor = () => {
  resetForm();
  emit('cancel');
};

function handleDelete() {
  if (props.monster) emit('delete', props.monster.id);
}

onMounted(async () => {
  await featureStores.load(['encounter', 'location']);
});
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="isOpen"
    :title="isEditing ? t('monsters.edit') : t('monsters.create')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!monster"
    :showExpand="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="monster-editor-modal"
    @submit="saveMonster"
    @delete="handleDelete"
    @cancel="closeEditor"
  >
    <template #main>
      <EntityInlineEditor
        v-model:title="editedMonster.name"
        :title-placeholder="t('monsters.fields.name')"
      >
        <EntityMarkdownEditor
          ref="markdownEditorRef"
          v-model="notes"
          :is-visual-mode="isWYSIWYGMode"
          :entity-id="editedMonster.id"
          entity-type="monster"
          :placeholder="t('common.notes')"
        />
      </EntityInlineEditor>
    </template>

    <template #links>
      <div class="column q-gutter-md">
        <EntitiesLinking
          v-if="featureStores.has('note')"
          kind="note"
          :model-value="monsterLinks"
          @update:model-value="(links) => setMonsterLinks('note', links)"
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

    <template #footer>
      <div class="q-mr-auto row items-center q-gutter-sm">
        <QToggle left-label v-model="isWYSIWYGMode">
          {{ t('markdownEditor.visualMode') }}
        </QToggle>
        <QBtn
          v-if="!isWYSIWYGMode && features.help"
          flat
          round
          class="monster-help-button"
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
