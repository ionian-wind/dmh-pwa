<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  showSubmit?: boolean;
  showCancel?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'cancel'): void;
}>();

function setBodyScroll(disabled: boolean) {
  if (disabled) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (props.isOpen && e.key === 'Escape') {
    emit('cancel');
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!props.isOpen) return;
  const dialog = document.querySelector('.modal-dialog');
  if (dialog && !dialog.contains(e.target as Node)) {
    emit('cancel');
  }
}

let popStateHandler: (() => void) | null = null;

watch(() => props.isOpen, (open) => {
  setBodyScroll(open);
  if (open) {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousedown', handleClickOutside);
    // Push a new state to the history stack
    window.history.pushState({ modal: true }, '');
    popStateHandler = () => {
      emit('cancel');
    };
    window.addEventListener('popstate', popStateHandler);
  } else {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('mousedown', handleClickOutside);
    if (popStateHandler) {
      window.removeEventListener('popstate', popStateHandler);
      popStateHandler = null;
    }
    // If modal was closed not by popstate, go back in history if needed
    if (window.history.state && window.history.state.modal) {
      window.history.back();
    }
  }
});

onMounted(() => {
  if (props.isOpen) {
    setBodyScroll(true);
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
  setBodyScroll(false);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('mousedown', handleClickOutside);
  if (popStateHandler) {
    window.removeEventListener('popstate', popStateHandler);
    popStateHandler = null;
  }
});
</script>

<template>
  <div v-if="isOpen" class="modal">
    <div class="modal-dialog">
      <div class="modal-header">
        <h2>{{ title }}</h2>
      </div>
      <form @submit.prevent="emit('submit')" class="modal-form">
        <div class="modal-scrollable">
          <slot />
        </div>
        <div v-if="$slots.actions || showSubmit || showCancel" class="modal-actions">
          <button v-if="showCancel" type="button" class="cancel-btn" @click="emit('cancel')">
            {{ cancelLabel || 'Cancel' }}
          </button>
          <button v-if="showSubmit" type="submit" class="submit-btn">
            {{ submitLabel || 'Save' }}
          </button>
          <slot name="actions" />
        </div>
      </form>
    </div>
  </div>
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
  z-index: 1000;
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
}

.modal-header {
  flex: 0 0 auto;
  padding: 2rem 2rem 0 2rem;
  margin-bottom: 0.5rem;
  background: var(--color-background);
  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
  z-index: 2;
}

.modal-header h2 {
  margin: 0;
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

.modal-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
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
  color: white;
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
</style> 