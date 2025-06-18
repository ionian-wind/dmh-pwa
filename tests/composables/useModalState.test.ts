import { useModalState } from '@/composables/useModalState';

describe('useModalState', () => {
  let modalState: ReturnType<typeof useModalState>;

  beforeEach(() => {
    modalState = useModalState();
  });

  afterEach(() => {
    // Reset modal state after each test
    modalState.closeModal();
  });

  describe('Initial State', () => {
    it('should start with modal closed', () => {
      expect(modalState.isModalOpen.value).toBe(false);
    });

    it('should start with no active modals', () => {
      expect(modalState.activeModals.value.size).toBe(0);
    });
  });

  describe('openModal', () => {
    it('should open modal without ID', () => {
      modalState.openModal();
      
      expect(modalState.isModalOpen.value).toBe(true);
      expect(modalState.activeModals.value.size).toBe(0);
    });

    it('should open modal with specific ID', () => {
      modalState.openModal('test-modal');
      
      expect(modalState.isModalOpen.value).toBe(true);
      expect(modalState.activeModals.value.has('test-modal')).toBe(true);
      expect(modalState.activeModals.value.size).toBe(1);
    });

    it('should open multiple modals with different IDs', () => {
      modalState.openModal('modal-1');
      modalState.openModal('modal-2');
      modalState.openModal('modal-3');
      
      expect(modalState.isModalOpen.value).toBe(true);
      expect(modalState.activeModals.value.has('modal-1')).toBe(true);
      expect(modalState.activeModals.value.has('modal-2')).toBe(true);
      expect(modalState.activeModals.value.has('modal-3')).toBe(true);
      expect(modalState.activeModals.value.size).toBe(3);
    });

    it('should not duplicate modal IDs', () => {
      modalState.openModal('test-modal');
      modalState.openModal('test-modal');
      
      expect(modalState.activeModals.value.has('test-modal')).toBe(true);
      expect(modalState.activeModals.value.size).toBe(1);
    });
  });

  describe('closeModal', () => {
    it('should close all modals when no ID provided', () => {
      modalState.openModal('modal-1');
      modalState.openModal('modal-2');
      
      modalState.closeModal();
      
      expect(modalState.isModalOpen.value).toBe(false);
      expect(modalState.activeModals.value.size).toBe(0);
    });

    it('should close specific modal by ID', () => {
      modalState.openModal('modal-1');
      modalState.openModal('modal-2');
      
      modalState.closeModal('modal-1');
      
      expect(modalState.isModalOpen.value).toBe(true); // modal-2 still open
      expect(modalState.activeModals.value.has('modal-1')).toBe(false);
      expect(modalState.activeModals.value.has('modal-2')).toBe(true);
      expect(modalState.activeModals.value.size).toBe(1);
    });

    it('should close modal and set isModalOpen to false when last modal is closed', () => {
      modalState.openModal('test-modal');
      
      modalState.closeModal('test-modal');
      
      expect(modalState.isModalOpen.value).toBe(false);
      expect(modalState.activeModals.value.size).toBe(0);
    });

    it('should handle closing non-existent modal ID', () => {
      modalState.openModal('existing-modal');
      
      modalState.closeModal('non-existent-modal');
      
      expect(modalState.isModalOpen.value).toBe(true);
      expect(modalState.activeModals.value.has('existing-modal')).toBe(true);
      expect(modalState.activeModals.value.size).toBe(1);
    });

    it('should handle closing modal when none are open', () => {
      modalState.closeModal('test-modal');
      
      expect(modalState.isModalOpen.value).toBe(false);
      expect(modalState.activeModals.value.size).toBe(0);
    });
  });

  describe('Multiple Modal Management', () => {
    it('should maintain multiple modals correctly', () => {
      modalState.openModal('modal-1');
      modalState.openModal('modal-2');
      modalState.openModal('modal-3');
      
      expect(modalState.isModalOpen.value).toBe(true);
      expect(modalState.activeModals.value.size).toBe(3);
      
      modalState.closeModal('modal-2');
      
      expect(modalState.isModalOpen.value).toBe(true);
      expect(modalState.activeModals.value.has('modal-1')).toBe(true);
      expect(modalState.activeModals.value.has('modal-2')).toBe(false);
      expect(modalState.activeModals.value.has('modal-3')).toBe(true);
      expect(modalState.activeModals.value.size).toBe(2);
    });

    it('should close all modals when last one is closed', () => {
      modalState.openModal('modal-1');
      modalState.openModal('modal-2');
      
      modalState.closeModal('modal-1');
      modalState.closeModal('modal-2');
      
      expect(modalState.isModalOpen.value).toBe(false);
      expect(modalState.activeModals.value.size).toBe(0);
    });
  });

  describe('Reactivity', () => {
    it('should be reactive when opening modal', () => {
      const initialValue = modalState.isModalOpen.value;
      
      modalState.openModal('test-modal');
      
      expect(modalState.isModalOpen.value).not.toBe(initialValue);
    });

    it('should be reactive when closing modal', () => {
      modalState.openModal('test-modal');
      const openValue = modalState.isModalOpen.value;
      
      modalState.closeModal('test-modal');
      
      expect(modalState.isModalOpen.value).not.toBe(openValue);
    });

    it('should be reactive for activeModals', () => {
      const initialSize = modalState.activeModals.value.size;
      
      modalState.openModal('test-modal');
      
      expect(modalState.activeModals.value.size).not.toBe(initialSize);
    });
  });

  describe('Readonly Properties', () => {
    it('should not allow direct modification of isModalOpen', () => {
      expect(() => {
        // @ts-ignore - Testing readonly behavior
        modalState.isModalOpen.value = true;
      }).toThrow();
    });

    it('should not allow direct modification of activeModals', () => {
      expect(() => {
        // @ts-ignore - Testing readonly behavior
        modalState.activeModals.value.add('test');
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string modal ID', () => {
      modalState.openModal('');
      
      expect(modalState.isModalOpen.value).toBe(true);
      expect(modalState.activeModals.value.has('')).toBe(true);
    });

    it('should handle special characters in modal ID', () => {
      const specialId = 'modal-with-special-chars-!@#$%^&*()';
      modalState.openModal(specialId);
      
      expect(modalState.activeModals.value.has(specialId)).toBe(true);
      
      modalState.closeModal(specialId);
      expect(modalState.activeModals.value.has(specialId)).toBe(false);
    });

    it('should handle very long modal IDs', () => {
      const longId = 'a'.repeat(1000);
      modalState.openModal(longId);
      
      expect(modalState.activeModals.value.has(longId)).toBe(true);
      
      modalState.closeModal(longId);
      expect(modalState.activeModals.value.has(longId)).toBe(false);
    });

    it('should handle rapid open/close operations', () => {
      for (let i = 0; i < 10; i++) {
        modalState.openModal(`modal-${i}`);
      }
      
      expect(modalState.activeModals.value.size).toBe(10);
      
      for (let i = 0; i < 10; i++) {
        modalState.closeModal(`modal-${i}`);
      }
      
      expect(modalState.isModalOpen.value).toBe(false);
      expect(modalState.activeModals.value.size).toBe(0);
    });
  });

  describe('Global State', () => {
    it('should share state between multiple composable instances', () => {
      const modalState1 = useModalState();
      const modalState2 = useModalState();
      
      modalState1.openModal('shared-modal');
      
      expect(modalState1.isModalOpen.value).toBe(true);
      expect(modalState2.isModalOpen.value).toBe(true);
      expect(modalState1.activeModals.value.has('shared-modal')).toBe(true);
      expect(modalState2.activeModals.value.has('shared-modal')).toBe(true);
      
      modalState2.closeModal('shared-modal');
      
      expect(modalState1.isModalOpen.value).toBe(false);
      expect(modalState2.isModalOpen.value).toBe(false);
    });
  });
}); 