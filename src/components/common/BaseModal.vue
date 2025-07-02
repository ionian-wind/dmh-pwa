<script setup lang="ts">
import { watch, onMounted, onUnmounted, computed, ref, useSlots } from 'vue';
import Button from './Button.vue';
import { useModalState } from '@/composables/useModalState';
import { useI18n } from 'vue-i18n';
import { IconX, IconArrowsMinimize, IconArrowsMaximize } from '@tabler/icons-vue';

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
  <Transition name="modal-fade">
    <div v-if="actuallyOpen" class="modal">
      <div class="modal-dialog" :class="{ 'is-expanded': isExpanded }">
        <div v-if="hasHeader" class="modal-header">
          <h2 v-if="title">{{ $t(title) }}</h2>
          <div class="header-actions">
            <slot name="header-actions" />
            <Button v-if="props.showExpand" @click="setExpanded(!isExpanded)" variant="light" :title="isExpanded ? $t('common.collapse') : $t('common.expand')">
              <IconArrowsMinimize v-if="isExpanded"/>
              <IconArrowsMaximize v-else />
            </Button>
            <Button v-if="props.showClose" variant="light" @click="$emit('cancel')" aria-label="Close" class="btn-close-modal">
              <IconX />
            </Button>
          </div>
        </div>
        <form @submit.prevent="emit('submit')" class="modal-form">
          <div class="modal-scrollable">
            <slot />
          </div>
          <div v-if="$slots.actions || showSubmit || showCancel" class="modal-actions">
            <Button v-if="showCancel" variant="secondary" @click="emit('cancel')">
              {{ $t(cancelLabel || '') || $t('common.cancel') }}
            </Button>
            <Button v-if="showSubmit" variant="primary" type="submit" :disabled="props.disableSubmit">
              {{ $t(submitLabel || '') || $t('common.save') }}
            </Button>
            <slot name="actions" />
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 8000;
  pointer-events: auto;
}

.modal-dialog {
  background: var(--color-background);
  border-radius: var(--border-radius);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 32px rgba(0,0,0,0.15);
  transition: all 0.3s ease-in-out;
}

.modal-dialog.is-expanded {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  border-radius: 0;
}

.modal-header {
  flex: 0 0 auto;
  padding: 2rem 2rem 0 2rem;
  margin-bottom: 0.5rem;
  background: var(--color-background);
  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 0;
  max-height: 60vh;
  transition: max-height 0.3s ease-in-out;
}

.modal-header h2 {
  margin: 0;
  color: var(--color-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 1.5rem;
  padding: 0;
  cursor: pointer;
  color: var(--color-text-light);
}

.btn-close-modal:hover {
  color: var(--color-text);
}

.modal-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
}

.modal-scrollable {
  overflow-y: auto;
  padding: 0 2rem 0 2rem;
  flex: 1 1 auto;
  min-height: 0;
  max-height: 60vh;
}

.modal-dialog.is-expanded .modal-scrollable {
  max-height: none;
}

.modal-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding: 1.5rem 2rem 2rem 2rem;
  background: var(--color-background);
  border-bottom-left-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);
  z-index: 2;
}

.submit-btn,
.cancel-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.submit-btn {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.cancel-btn {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.submit-btn:hover {
  background: var(--color-primary-dark);
}

.cancel-btn:hover {
  background: var(--color-background-mute);
}

/* Modal open/close animation */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s cubic-bezier(.4,0,.2,1);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-to,
.modal-fade-leave-from {
  opacity: 1;
}

.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog {
  transition: transform 0.25s cubic-bezier(.4,0,.2,1), opacity 0.25s cubic-bezier(.4,0,.2,1);
}
.modal-fade-enter-from .modal-dialog {
  transform: scale(0.96);
  opacity: 0;
}
.modal-fade-enter-to .modal-dialog {
  transform: scale(1);
  opacity: 1;
}
.modal-fade-leave-from .modal-dialog {
  transform: scale(1);
  opacity: 1;
}
.modal-fade-leave-to .modal-dialog {
  transform: scale(0.96);
  opacity: 0;
}
</style> 