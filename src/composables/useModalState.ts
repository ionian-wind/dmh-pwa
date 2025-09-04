import { ref, readonly, computed } from 'vue';

// Global modal stack state
const modalStack = ref<string[]>([]);

// Global mention modal stack: { modalId, entity, kind }
const mentionModalStack = ref<{ modalId: string; entity: any; kind: string }[]>(
  [],
);

export function useModalState() {
  const openModal = (modalId: string) => {
    if (!modalId) return;
    // Only push if not already top of stack
    if (modalStack.value[modalStack.value.length - 1] !== modalId) {
      modalStack.value.push(modalId);
    }
  };

  const closeModal = (modalId: string) => {
    if (!modalId) return;
    // Only pop if it's the top of the stack
    if (modalStack.value[modalStack.value.length - 1] === modalId) {
      modalStack.value.pop();
    } else {
      // Remove all occurrences (shouldn't happen in normal flow)
      modalStack.value = modalStack.value.filter((id) => id !== modalId);
    }
  };

  // Mention modal stack helpers
  const openMentionModal = (modalId: string, entity: any, kind: string) => {
    // Check if previous in stack is the same entity (by kind and id)
    const current = mentionModalStack.value[mentionModalStack.value.length - 1];
    const prev = mentionModalStack.value[mentionModalStack.value.length - 2];
    const entityId = entity?.id;
    const prevId = prev?.entity?.id;
    if (
      prev &&
      prev.kind === kind &&
      prevId &&
      entityId &&
      prevId === entityId
    ) {
      // If same entity, just close current modal (pop top)
      closeMentionModal(current?.modalId);
      return;
    }
    mentionModalStack.value.push({ modalId, entity, kind });
    openModal(modalId);
  };

  const closeMentionModal = (modalId: string) => {
    // Only pop if it's the top
    if (
      mentionModalStack.value.length &&
      mentionModalStack.value[mentionModalStack.value.length - 1].modalId ===
        modalId
    ) {
      mentionModalStack.value.pop();
    } else {
      // Remove all occurrences (shouldn't happen in normal flow)
      mentionModalStack.value = mentionModalStack.value.filter(
        (m) => m.modalId !== modalId,
      );
    }
    closeModal(modalId);
  };

  const currentMentionModal = computed(() =>
    mentionModalStack.value.length > 0
      ? mentionModalStack.value[mentionModalStack.value.length - 1]
      : null,
  );

  const isModalOpen = computed(() => modalStack.value.length > 0);
  const currentModalId = computed(
    () => modalStack.value[modalStack.value.length - 1] || null,
  );

  return {
    isModalOpen: readonly(isModalOpen),
    modalStack: readonly(modalStack),
    currentModalId,
    openModal,
    closeModal,
    // Mention modal helpers
    openMentionModal,
    closeMentionModal,
    currentMentionModal,
  };
}
