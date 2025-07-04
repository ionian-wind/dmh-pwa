<script setup lang="ts">
import { watch, onMounted, onUnmounted, computed, ref, useSlots } from 'vue';
import Button from '../form/Button.vue';
import { useModalState } from '@/composables/useModalState';
import { useI18n } from 'vue-i18n';
import { IconX, IconArrowsMinimize, IconArrowsMaximize } from '@tabler/icons-vue';
import { QDialog, QCard, QCardSection, QCardActions } from 'quasar';

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
const hasHeader = computed(() => !!props.title || !!slots['header-actions'] || !!props.showExpand || !!props.showClose);

// Only show modal if it's open and is the top of the stack
const actuallyOpen = computed(() => props.isOpen && currentModalId.value === props.modalId);

const { t } = useI18n();

function setBodyScroll(disabled: boolean) {
  if (disabled) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (actuallyOpen.value && e.key === 'Escape') {
    emit('cancel');
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!actuallyOpen.value) return;
  const dialog = document.querySelector('.modal-dialog');
  if (dialog && !dialog.contains(e.target as Node)) {
    emit('cancel');
  }
}

let popStateHandler: (() => void) | null = null;

watch(() => props.isOpen, (open) => {
  setBodyScroll(open && actuallyOpen.value);
  if (open) {
    openModal(props.modalId);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousedown', handleClickOutside);
    window.history.pushState({ modal: true }, '');
    popStateHandler = () => {
      emit('cancel');
    };
    window.addEventListener('popstate', popStateHandler);
  } else {
    closeModal(props.modalId);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('mousedown', handleClickOutside);
    if (popStateHandler) {
      window.removeEventListener('popstate', popStateHandler);
      popStateHandler = null;
    }
    if (window.history.state && window.history.state.modal) {
      window.history.back();
    }
  }
});

onMounted(() => {
  if (props.isOpen) {
    openModal(props.modalId);
    setBodyScroll(actuallyOpen.value);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousedown', handleClickOutside);
    window.history.pushState({ modal: true }, '');
    popStateHandler = () => {
      emit('cancel');
    };
    window.addEventListener('popstate', popStateHandler);
  }
});

onUnmounted(() => {
  closeModal(props.modalId);
  setBodyScroll(false);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('mousedown', handleClickOutside);
  if (popStateHandler) {
    window.removeEventListener('popstate', popStateHandler);
    popStateHandler = null;
  }
});

// Sync prop to local state
watch(() => props.isExpanded, (val) => {
  if (typeof val === 'boolean') isExpanded.value = val;
});

// Emit update when local state changes
function setExpanded(val: boolean) {
  isExpanded.value = val;
  emit('update:isExpanded', val);
}
</script>

<template>
  <QDialog v-model="actuallyOpen" persistent transition-show="fade" transition-hide="fade">
    <QCard :class="['modal-dialog', { 'is-expanded': isExpanded }]" style="max-width: 800px; width: 90vw; max-height: 90vh;">
      <QCardSection v-if="hasHeader" class="modal-header">
        <div class="row items-center no-wrap q-gutter-sm">
          <div class="col">
            <h2 v-if="title">{{ t(title) }}</h2>
          </div>
          <div class="col-auto header-actions">
            <slot name="header-actions" />
            <Button v-if="props.showExpand" class="modal-expand-btn" @click="setExpanded(!isExpanded)" variant="light" :title="isExpanded ? t('common.collapse') : t('common.expand')">
              <IconArrowsMinimize v-if="isExpanded"/>
              <IconArrowsMaximize v-else />
            </Button>
            <Button v-if="props.showClose" variant="light" @click="$emit('cancel')" aria-label="Close" class="btn-close-modal">
              <IconX />
            </Button>
          </div>
        </div>
      </QCardSection>
      <form @submit.prevent="emit('submit')" class="modal-form">
        <QCardSection class="modal-scrollable">
          <slot />
        </QCardSection>
        <QCardActions v-if="$slots.actions || showSubmit || showCancel" class="modal-actions" align="right">
          <Button v-if="showCancel" variant="secondary" @click="emit('cancel')">
            {{ t(cancelLabel || '') || t('common.cancel') }}
          </Button>
          <Button v-if="showSubmit" variant="primary" type="submit" :disabled="props.disableSubmit">
            {{ t(submitLabel || '') || t('common.save') }}
          </Button>
          <slot name="actions" />
        </QCardActions>
      </form>
    </QCard>
  </QDialog>
</template>

<style scoped>
.modal-header {
  padding: 2rem 2rem 0 2rem;
  margin-bottom: 0.5rem;
  background: var(--color-background);
}
.modal-dialog.is-expanded {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  border-radius: 0 !important;
}
.modal-scrollable {
  max-height: 60vh;
  overflow-y: auto;
}
.modal-actions {
  padding: 1rem 2rem 2rem 2rem;
  background: var(--color-background);
}
</style> 
