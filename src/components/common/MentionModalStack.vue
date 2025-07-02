<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import Markdown from '@/components/common/Markdown.vue';
import { useModalState } from '@/composables/useModalState';
import { useI18n } from 'vue-i18n';

const { currentMentionModal, currentModalId, closeMentionModal } = useModalState();
const { t } = useI18n();

const showModal = computed(() => {
  const show = !!(currentMentionModal.value && currentMentionModal.value.modalId === currentModalId.value);
  return show;
});

const modalEntity = computed(() => currentMentionModal.value?.entity || null);
const modalKind = computed(() => currentMentionModal.value?.kind || '');
const modalId = computed(() => currentMentionModal.value?.modalId || '');

function handleClose() {
  if (modalId.value) closeMentionModal(modalId.value);
}
</script>

<template>
  <BaseModal
    v-if="showModal"
    :isOpen="showModal"
    :title="modalEntity?.title || modalEntity?.name || t('modal.entityDetails')"
    :showClose="true"
    :modalId="modalId"
    @cancel="handleClose"
  >
    <template #default>
      <div v-if="modalEntity">
        <div v-if="modalKind === 'note'">
          <Markdown :content="modalEntity.content || ''" :enableMentionModal="true" />
        </div>
        <div v-else-if="modalKind === 'module'">
          <div>{{ modalEntity.description }}</div>
        </div>
        <div v-else-if="modalKind === 'party'">
          <div>{{ modalEntity.description }}</div>
        </div>
        <div v-else-if="modalKind === 'monster'">
          <h2>{{ modalEntity.name }}</h2>
          <div v-if="modalEntity.description">{{ modalEntity.description }}</div>
        </div>
        <div v-else-if="modalKind === 'encounter'">
          <h2>{{ modalEntity.name }}</h2>
          <div v-if="modalEntity.description">{{ modalEntity.description }}</div>
        </div>
      </div>
      <div v-else>
        <div style="color: var(--color-danger, red);">{{ t('modal.entityNotFound') }}</div>
      </div>
    </template>
  </BaseModal>
</template> 