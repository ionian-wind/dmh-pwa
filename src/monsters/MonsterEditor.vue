<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useModuleStore } from '@/stores/modules';
import type { Monster } from '@/types';
import ModuleMultipleSelector from '@/components/ModuleMultipleSelector.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { alert } from '@/dialogs';

const { t } = useI18n();
const moduleStore = useModuleStore();

const props = defineProps<{
  monster: Monster | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', monster: Monster): void;
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

const moduleIdsProxy = computed<string[]>({
  get() {
    return editedMonster.value.moduleIds ?? [];
  },
  set(val) {
    editedMonster.value.moduleIds = val;
  },
});
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="isEditing ? t('monsters.edit') : t('monsters.create')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="monster-editor-modal"
    @submit="saveMonster"
    @cancel="closeEditor"
  >
    <div class="form-section">
      <h3>{{ t('editor.basicInformation') }}</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="monster-name">{{ t('common.name') }}</label>
          <QInput
            id="monster-name"
            v-model="editedMonster.name"
            type="text"
            required
            dense
            outlined
          />
        </div>
      </div>
    </div>
    <div class="form-section">
      <h3>{{ t('monsterEditor.sections.modules') }}</h3>
      <div class="form-group">
        <label for="monster-modules">{{ t('monsterEditor.sections.modules') }}</label>
        <ModuleMultipleSelector
          id="monster-modules"
          v-model="moduleIdsProxy"
          placeholder="{{ t('monsterEditor.placeholders.noModules') }}"
        />
      </div>
    </div>
    <div class="form-section">
      <h3>{{ t('monsterEditor.sections.notes') }}</h3>
      <div class="form-group">
        <label for="monster-notes">{{ t('monsterEditor.sections.notes') }}</label>
        <QInput
          id="monster-notes"
          v-model="editedMonster.notes"
          type="textarea"
          :rows="3"
          dense
          outlined
        />
      </div>
    </div>
  </BaseModal>
</template>

<style scoped></style>
