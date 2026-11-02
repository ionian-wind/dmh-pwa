<script setup lang="ts">
import {
  watch,
  onMounted,
  onUnmounted,
  computed,
  ref,
  useSlots,
  nextTick,
} from 'vue';
import { useModalState } from '@/composables/useModalState';
import { useI18n } from 'vue-i18n';
import {
  IconX,
  IconArrowsMinimize,
  IconArrowsMaximize,
} from '@tabler/icons-vue';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    showSubmit?: boolean;
    showCancel?: boolean;
    showDelete?: boolean;
    submitLabel?: string;
    cancelLabel?: string;
    deleteLabel?: string;
    showClose?: boolean;
    modalId: string;
    showExpand?: boolean;
    isExpanded?: boolean;
    disableSubmit?: boolean;
  }>(),
  {
    showClose: true,
  },
);

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'cancel'): void;
  (e: 'delete'): void;
  (e: 'update:isOpen', value: boolean): void;
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
const actuallyOpen = computed({
  get: () => props.isOpen && currentModalId.value === props.modalId,
  set: (value: boolean) => {
    if (!value) requestClose();
  },
});

const { t } = useI18n();

function requestClose() {
  emit('update:isOpen', false);
  emit('cancel');
}

watch(
  () => props.isOpen,
  (open) => {
    nextTick(() => {
      if (open) {
        openModal(props.modalId);
      } else {
        closeModal(props.modalId);
      }
    });
  },
);

onMounted(() => {
  if (props.isOpen) {
    nextTick(() => {
      openModal(props.modalId);
    });
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
            v-if="props.showClose !== false"
            flat
            variant="light"
            @click="requestClose"
            :aria-label="t('common.close')"
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
        v-if="$slots.footer || $slots.actions || showSubmit || showCancel"
        class="modal-actions"
        align="right"
      >
        <slot name="footer" />
        <slot name="actions" />
        <QBtn
          flat
          v-if="showDelete"
          color="negative"
          :label="deleteLabel || t('common.delete')"
          @click="$emit('delete')"
        />
        <QBtn
          flat
          v-if="showCancel"
          color="standard"
          text-color="dark"
          @click="requestClose"
        >
          {{ cancelLabel || t('common.cancel') }}
        </QBtn>
        <QBtn
          flat
          v-if="showSubmit"
          :color="'positive'"
          type="submit"
          :disabled="props.disableSubmit"
          @click.prevent="$emit('submit')"
        >
          {{ submitLabel || t('common.save') }}
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
