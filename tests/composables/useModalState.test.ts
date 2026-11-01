import { beforeEach, describe, expect, it } from 'vitest';
import { useModalState } from '@/composables/useModalState';

function closeAll(state: ReturnType<typeof useModalState>) {
  let guard = 0;
  while (state.currentModalId.value && guard++ < 100) {
    state.closeModal(state.currentModalId.value);
  }
}

describe('useModalState', () => {
  let state: ReturnType<typeof useModalState>;

  beforeEach(() => {
    state = useModalState();
    closeAll(state);
  });

  it('starts closed', () => {
    expect(state.isModalOpen.value).toBe(false);
    expect(state.currentModalId.value).toBeNull();
  });

  it('opens and tracks the top modal', () => {
    state.openModal('a');
    expect(state.isModalOpen.value).toBe(true);
    expect(state.currentModalId.value).toBe('a');

    state.openModal('b');
    expect(state.currentModalId.value).toBe('b');
  });

  it('does not duplicate the top modal', () => {
    state.openModal('a');
    state.openModal('a');
    expect(state.modalStack.value).toEqual(['a']);
  });

  it('closes the top modal', () => {
    state.openModal('a');
    state.openModal('b');
    state.closeModal('b');
    expect(state.currentModalId.value).toBe('a');
    state.closeModal('a');
    expect(state.currentModalId.value).toBeNull();
  });

  it('tracks mention modals and their entities', () => {
    state.openMentionModal('m1', { id: 'n1' }, 'note');
    state.openMentionModal('m2', { id: 'm1' }, 'monster');

    expect(state.currentMentionModal.value).toMatchObject({
      modalId: 'm2',
      kind: 'monster',
      entity: { id: 'm1' },
    });

    state.closeMentionModal('m2');
    expect(state.currentMentionModal.value?.modalId).toBe('m1');
    state.closeMentionModal('m1');
    expect(state.currentMentionModal.value).toBeNull();
  });

  it('treats reopening the previous entity as a back action', () => {
    state.openMentionModal('m1', { id: 'n1' }, 'note');
    state.openMentionModal('m2', { id: 'm1' }, 'monster');

    // Requesting the entity two levels down closes the current modal.
    state.openMentionModal('m3', { id: 'n1' }, 'note');
    expect(state.currentMentionModal.value?.modalId).toBe('m1');
  });
});
