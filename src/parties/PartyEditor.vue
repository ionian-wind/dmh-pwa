<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import { useI18n } from 'vue-i18n';
import { useModuleStore } from '@/stores/modules';
import type { Party } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import ModuleMultipleSelector from '@/components/ModuleMultipleSelector.vue';
import { alert } from '@/dialogs';
import {UUID} from "@/types";

const { t } = useI18n();
const moduleStore = useModuleStore();

const props = defineProps<{
  party: Party | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', party: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): void;
  (e: 'cancel'): void;
}>();

type PartyForm = Omit<Party, 'id' | 'createdAt' | 'updatedAt'>;

const editedParty = ref<PartyForm>({
  name: '',
  description: '',
  notes: '',
  characters: [],
  moduleIds: [],
});

const moduleIdsProxy = computed<UUID[]>({
  get() {
    return editedParty.value.moduleIds ?? [];
  },
  set(val: UUID[]) {
    editedParty.value.moduleIds = val;
  },
});

watch(
  () => props.party,
  (newParty) => {
    if (newParty) {
      const { id, createdAt, updatedAt, ...partyData } = newParty;
      editedParty.value = { ...partyData };
    } else {
      editedParty.value = {
        name: '',
        description: '',
        notes: '',
        characters: [],
        moduleIds: [],
      };
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  if (!editedParty.value.name) {
    await alert(t('common.nameRequired'));
    return;
  }
  // Ensure moduleIds is always an array of strings
  editedParty.value.moduleIds = (editedParty.value.moduleIds || []).map((id: any) =>
    typeof id === 'string' ? id : id?.id || ''
  ).filter(Boolean);
  emit('submit', editedParty.value);
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="party ? t('parties.edit') : t('parties.create')"
    :showSubmit="true"
    :showCancel="true"
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    modalId="party-editor-modal"
    @submit="handleSubmit"
    @cancel="handleCancel"
  >
    <div class="form-section">
      <div class="form-grid">
        <div class="form-group">
          <QInput
            :label="t('parties.fields.name')"
            id="party-name"
            v-model="editedParty.name"
            type="text"
            required
            outlined
          />
        </div>
        <div class="form-group">
          <ModuleMultipleSelector
            id="party-modules"
            v-model="moduleIdsProxy"
            :placeholder="'parties.fields.modules'"
          />
        </div>
        <div class="form-group">
          <QInput
            :label="t('parties.fields.description')"
            id="party-description"
            v-model="editedParty.description"
            type="textarea"
            :rows="5"
            autogrow
            outlined
          />
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-group">
        <QInput
          :label="t('parties.fields.notes')"
          id="party-description"
          v-model="editedParty.notes"
          type="textarea"
          :rows="5"
          autogrow
          outlined
        />
      </div>
    </div>
  </BaseModal>
</template>
