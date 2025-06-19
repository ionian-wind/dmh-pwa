import { ref, readonly, computed } from 'vue';

// Global modal stack state
const modalStack = ref<string[]>([]);

export function useModalState() {
  const openModal = (modalId?: string) => {
    if (modalId) {
      // Only push if not already top of stack
      if (modalStack.value[modalStack.value.length - 1] !== modalId) {
        modalStack.value.push(modalId);
      }
    }
  };

  const closeModal = (modalId?: string) => {
    if (modalId) {
      // Remove the modalId from the stack (from the top only)
      if (modalStack.value[modalStack.value.length - 1] === modalId) {
        modalStack.value.pop();
      } else {
        // Remove all occurrences (shouldn't happen in normal flow)
        modalStack.value = modalStack.value.filter(id => id !== modalId);
      }
    } else {
      // Close all modals
      modalStack.value = [];
    }
  };

  const isModalOpen = computed(() => modalStack.value.length > 0);
  const currentModalId = computed(() => modalStack.value[modalStack.value.length - 1] || null);

  return {
    isModalOpen: readonly(isModalOpen),
    modalStack: readonly(modalStack),
    currentModalId,
    openModal,
    closeModal
  };
} 