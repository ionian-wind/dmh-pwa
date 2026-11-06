import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import MentionModalStack from '@/components/common/MentionModalStack.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useModalState } from '@/composables/useModalState';

const routerMocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@/router', () => ({ default: { push: routerMocks.push } }));

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

  it('closes the mention modal and opens the related entity view', async () => {
    const wrapper = mount(MentionModalStack);
    openMentionModal(
      'note-modal',
      { id: 'n1', title: 'Session', content: 'Recap' },
      'note',
    );
    await nextTick();

    const open = wrapper.find('button[aria-label="Open entity"]');
    expect(open.exists()).toBe(true);
    await open.trigger('click');
    await nextTick();

    expect(routerMocks.push).toHaveBeenCalledWith('/notes/n1');
    expect(wrapper.findComponent(BaseModal).exists()).toBe(false);
    wrapper.unmount();
  });

  it.each([
    ['character', { id: 'c1', name: 'Hero' }, '/characters/c1'],
    ['location', { id: 'l1', name: 'Town' }, '/locations/l1'],
  ])('opens the %s entity route', async (kind, entity, route) => {
    const wrapper = mount(MentionModalStack);
    openMentionModal(`${kind}-modal`, entity, kind);
    await nextTick();

    await wrapper.find('button[aria-label="Open entity"]').trigger('click');
    await nextTick();

    expect(routerMocks.push).toHaveBeenCalledWith(route);
    wrapper.unmount();
  });

  it('hides the external-link action for unknown entity kinds', async () => {
    const wrapper = mount(MentionModalStack);
    openMentionModal('unknown-modal', { id: 'x1', name: 'Unknown' }, 'unknown');
    await nextTick();

    expect(wrapper.find('button[aria-label="Open entity"]').exists()).toBe(
      false,
    );
    wrapper.unmount();
  });
});
