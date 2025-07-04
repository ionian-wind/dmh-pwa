<script setup lang="ts">
import { watch, onMounted, onUnmounted, computed, ref, useSlots } from 'vue';
import { useModalState } from '@/composables/useModalState';
import { useI18n } from 'vue-i18n';
import {
  IconX,
  IconArrowsMinimize,
  IconArrowsMaximize,
} from '@tabler/icons-vue';

const props = defineProps<{
  isOpen: boolean;
  title?: string;
  showSubmit?: boolean;
  showCancel?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showClose?: boolean;
  modalId: string;
  showExpand?: boolean;
  isExpanded?: boolean;
  disableSubmit?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'cancel'): void;
  (e: 'update:isExpanded', value: boolean): void;
}>();

const { openModal, closeModal, currentModalId } = useModalState();
const isExpanded = ref(props.isExpanded ?? false);
const slots = useSlots();
const hasHeader = computed(
  () =>
    !!props.title ||
    !!slots['header-actions'] ||
    !!props.showExpand ||
    !!props.showClose,
);

// Only show modal if it's open and is the top of the stack
const actuallyOpen = computed(
  () => props.isOpen && currentModalId.value === props.modalId,
);

const { t } = useI18n();

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      openModal(props.modalId);
    } else {
      closeModal(props.modalId);
    }
  },
);

onMounted(() => {
  if (props.isOpen) {
    openModal(props.modalId);
  }
});

onUnmounted(() => closeModal(props.modalId));

// Sync prop to local state
watch(
  () => props.isExpanded,
  (val) => {
    if (typeof val === 'boolean') isExpanded.value = val;
  },
);

// Emit update when local state changes
function setExpanded(val: boolean) {
  isExpanded.value = val;
  emit('update:isExpanded', val);
}
</script>

<template>
  <QDialog
    :maximized="isExpanded"
    v-model="actuallyOpen"
    persistent
    transition-show="fade"
    transition-hide="fade"
  >
    <QCard
      class="q-dialog-plugin q-mx-auto column no-wrap"
      :class="{ fit: isExpanded }"
      :style="
        !isExpanded
          ? 'min-width: 60vw; max-width: 90vw; height: 70vh; max-height: 90vh;'
          : undefined
      "
    >
      <QCardSection class="modal-header">
        <QToolbar v-if="hasHeader" class="justify-between">
          <QBtn
            flat
            v-if="props.showExpand"
            class="modal-expand-btn"
            @click="setExpanded(!isExpanded)"
            variant="light"
            :title="isExpanded ? t('common.collapse') : t('common.expand')"
          >
            <IconArrowsMinimize v-if="isExpanded" />
            <IconArrowsMaximize v-else />
          </QBtn>

          {{ title }}

          <slot name="header-actions" />

          <QBtn
            flat
            variant="light"
            @click="$emit('cancel')"
            aria-label="Close"
            class="btn-close-modal"
          >
            <IconX />
          </QBtn>
        </QToolbar>
      </QCardSection>
      <QScrollArea class="fit q-pa-sm">
        <form
          @submit.prevent="$emit('submit')"
          class="modal-form q-gutter-y-md"
        >
          <slot />
        </form>
      </QScrollArea>
      <QCardActions
        v-if="$slots.actions || showSubmit || showCancel"
        class="modal-actions"
        align="right"
      >
        <slot name="actions" />
        <QBtn
          flat
          v-if="showCancel"
          :color="'standard'"
          @click="$emit('cancel')"
        >
          {{ t(cancelLabel || 'common.cancel') }}
        </QBtn>
        <QBtn
          flat
          v-if="showSubmit"
          :color="'positive'"
          type="submit"
          :disabled="props.disableSubmit"
          @click.prevent="$emit('submit')"
        >
          {{ t(submitLabel || 'common.save') }}
        </QBtn>
      </QCardActions>
    </QCard>
  </QDialog>
</template>

<style scoped>
.modal-header {
  padding-bottom: 0;
}
</style>
