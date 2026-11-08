<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { IconExternalLink } from '@tabler/icons-vue';
import BaseModal from '@/components/common/BaseModal.vue';
import EntityMainContent from '@/components/common/EntityMainContent.vue';
import { useModalState } from '@/composables/useModalState';
import { useI18n } from 'vue-i18n';
import router from '@/router';
import { featureLinkKinds } from 'virtual:feature-links';
import { noteDisplayTitle } from '@/utils/noteTitle';

const { currentMentionModal, currentModalId, closeMentionModal } =
  useModalState();
const { t } = useI18n();

const showModal = computed(() => {
  const show = !!(
    currentMentionModal.value &&
    currentMentionModal.value.modalId === currentModalId.value
  );
  return show;
});

const modalEntity = computed(() => currentMentionModal.value?.entity || null);
const modalKind = computed(() => currentMentionModal.value?.kind || '');
const modalId = computed(() => currentMentionModal.value?.modalId || '');
const modalTitle = computed(
  () =>
    modalEntity.value?.title?.trim() ||
    (modalKind.value === 'note'
      ? noteDisplayTitle(modalEntity.value)
      : modalEntity.value?.name) ||
    t('modal.entityDetails'),
);
const externalRoute = computed(() => {
  const id = modalEntity.value?.id;
  if (!id) return null;

  if (!featureLinkKinds.some((option) => option.kind === modalKind.value)) {
    return null;
  }

  switch (modalKind.value) {
    case 'note':
      return `/notes/${id}`;
    case 'party':
      return `/parties/${id}`;
    case 'pawn':
      return `/pawns/${id}`;
    case 'encounter':
      return `/encounters/${id}`;
    case 'character':
      return `/characters/${id}`;
    case 'location':
      return `/locations/${id}`;
    default:
      return null;
  }
});

function handleClose() {
  if (modalId.value) closeMentionModal(modalId.value);
}

function openExternalEntity() {
  const route = externalRoute.value;
  if (!route) return;
  handleClose();
  void router.push(route);
}
</script>

<template>
  <BaseModal
    v-if="showModal"
    :isOpen="showModal"
    :showClose="true"
    :showExpand="true"
    :modalId="modalId"
    @cancel="handleClose"
  >
    <template #header-left-actions>
      <QBtn
        v-if="externalRoute"
        flat
        variant="light"
        :title="t('common.openEntity')"
        :aria-label="t('common.openEntity')"
        @click="openExternalEntity"
      >
        <IconExternalLink />
      </QBtn>
    </template>

    <template #default>
      <div v-if="modalEntity">
        <header class="mention-modal-header q-mb-md">
          <h1
            class="mention-modal-title entity-page-title text-h5 text-weight-medium q-ma-none"
          >
            {{ modalTitle }}
          </h1>
        </header>
        <EntityMainContent :kind="modalKind" :entity="modalEntity" />
      </div>
      <div v-else>
        <div style="color: var(--color-danger, red)">
          {{ t('modal.entityNotFound') }}
        </div>
      </div>
    </template>
  </BaseModal>
</template>
