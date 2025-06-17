import { ref, readonly } from 'vue';

// Global modal state
const isModalOpen = ref(false);
const activeModals = ref<Set<string>>(new Set());

export function useModalState() {
  const openModal = (modalId?: string) => {
    isModalOpen.value = true;
    if (modalId) {
      activeModals.value.add(modalId);
    }
  };

  const closeModal = (modalId?: string) => {
    if (modalId) {
      activeModals.value.delete(modalId);
      // Only set to false if no other modals are open
      if (activeModals.value.size === 0) {
        isModalOpen.value = false;
      }
    } else {
      // Close all modals
      activeModals.value.clear();
      isModalOpen.value = false;
    }
  };

  return {
    isModalOpen: readonly(isModalOpen),
    activeModals: readonly(activeModals),
    openModal,
    closeModal
  };
} 