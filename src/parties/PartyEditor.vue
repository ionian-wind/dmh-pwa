<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Party } from '@/types';
import BaseModal from '@/components/common/BaseModal.vue';
import { alert } from '@/dialogs';
import { UUID } from '@/types';
import EntitiesLinking from '@/components/common/EntitiesLinking.vue';
import { useEntityEditorTabs } from '@/components/common/entityEditorTabs';
import type { MapEntityRef } from '@/maps/types';

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
  notes: '',
  characters: [],
  moduleIds: [],
});

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
  editedParty.value.moduleIds = (editedParty.value.moduleIds || [])
    .map((id: any) => (typeof id === 'string' ? id : id?.id || ''))
    .filter(Boolean);
  emit('submit', {
    ...editedParty.value,
    id: props.party?.id ?? '',
    createdAt: props.party?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
};

const handleCancel = () => {
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
    :submitLabel="t('common.save')"
    :cancelLabel="t('common.cancel')"
    :tabs="editorTabs"
    modalId="party-editor-modal"
    @submit="handleSubmit"
    @delete="handleDelete"
    @cancel="handleCancel"
  >
    <template #main>
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
  </BaseModal>
</template>
