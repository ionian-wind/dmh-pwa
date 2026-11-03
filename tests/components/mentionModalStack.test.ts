import { afterEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import MentionModalStack from '@/components/common/MentionModalStack.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useModalState } from '@/composables/useModalState';

const { openMentionModal, closeMentionModal, currentMentionModal } =
  useModalState();

function cleanup() {
  while (currentMentionModal.value) {
    closeMentionModal(currentMentionModal.value.modalId);
  }
}

describe('MentionModalStack', () => {
  afterEach(cleanup);

  it('renders note mentions with markdown and closes them', async () => {
    const wrapper = mount(MentionModalStack);
    openMentionModal(
      'note-modal',
      { id: 'n1', title: 'Session', content: '# Recap' },
      'note',
    );
    await nextTick();

    expect(wrapper.text()).toContain('Session');
    expect(wrapper.text()).toContain('Recap');

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    await nextTick();
    expect(wrapper.findComponent(BaseModal).exists()).toBe(false);
    wrapper.unmount();
  });

  it.each([
    ['module', { id: 'm1', name: 'Module', description: 'Module desc' }],
    ['party', { id: 'p1', name: 'Party', description: 'Party desc' }],
    ['monster', { id: 'mo1', name: 'Goblin', description: 'Monster desc' }],
    ['encounter', { id: 'e1', name: 'Ambush', description: 'Encounter desc' }],
  ])('renders %s mentions', async (kind, entity) => {
    const wrapper = mount(MentionModalStack);
    openMentionModal(`${kind}-modal`, entity, kind);
    await nextTick();

    expect(wrapper.text()).toContain(entity.name);
    expect(wrapper.text()).toContain('desc');
    wrapper.unmount();
  });

  it('shows a fallback when the mentioned entity is missing', async () => {
    const wrapper = mount(MentionModalStack);
    openMentionModal('missing-modal', null, 'note');
    await nextTick();

    expect(wrapper.text()).toContain('Entity not found');
    wrapper.unmount();
  });
});
