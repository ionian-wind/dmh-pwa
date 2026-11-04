<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Monster } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import { alert } from '@/dialogs';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';

const { t } = useI18n();

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

const blankMonster = (): Monster => ({
  id: '',
  name: '',
  notes: '',
  moduleIds: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const editedMonster = ref<Monster>(blankMonster());

const isEditing = computed(() => !!props.monster?.id);

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
  (newVal) => {
    if (newVal && !props.monster) {
      editedMonster.value = blankMonster();
    }
  },
);

const resetForm = () => {
  editedMonster.value = blankMonster();
};

const saveMonster = async () => {
  if (!editedMonster.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }

  emit('submit', { ...editedMonster.value });
  closeEditor();
};

const closeEditor = () => {
  resetForm();
  emit('cancel');
};

const editorTabs = useEntityEditorTabs();

const linkedModules = computed<MapEntityRef[]>(() =>
  (editedMonster.value.moduleIds ?? []).map((id) => ({ kind: 'module', id })),
);

function setLinkedModules(links: MapEntityRef[]) {
  editedMonster.value.moduleIds = links.map((link) => link.id);
}

function handleDelete() {
  if (props.monster) emit('delete', props.monster.id);
}
</script>

<template>
  <BaseModal
    :use-modal-stack="useModalStack"
    :isOpen="isOpen"
    :title="isEditing ? t('monsters.edit') : t('monsters.create')"
    :showSubmit="true"
    :showCancel="true"
    :showDelete="!!monster"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="monster-editor-modal"
    @submit="saveMonster"
    @delete="handleDelete"
    @cancel="closeEditor"
  >
    <template #main>
      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <QInput
              :label="t('monsters.fields.name')"
              id="monster-name"
              v-model="editedMonster.name"
              type="text"
              required
              outlined
            />
          </div>
        </div>
      </div>
      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <QInput
              :label="t('common.notes')"
              id="monster-notes"
              v-model="editedMonster.notes"
              type="textarea"
              :rows="5"
              autogrow
              outlined
            />
          </div>
        </div>
      </div>
    </template>

    <template #links>
      <EntitiesLinking
        kind="module"
        :model-value="linkedModules"
        @update:model-value="setLinkedModules"
      />
    </template>
  </BaseModal>
</template>

<style scoped></style>
