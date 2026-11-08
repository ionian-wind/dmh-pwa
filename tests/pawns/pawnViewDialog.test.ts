import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PawnViewDialog from '@/pawns/PawnViewDialog.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import type { Pawn } from '@/types';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouter: () => ({ push: mocks.push }),
}));

const MilkdownViewStub = {
  name: 'MilkdownView',
  props: ['content'],
  template: '<div class="milkdown-view-stub">{{ content }}</div>',
};

const pawn: Pawn = {
  id: 'pawn-1',
  name: 'Goblin',
  notes: 'Fierce little creature',
  createdAt: 1,
  updatedAt: 1,
};

function mountDialog(overrides: Record<string, unknown> = {}) {
  return mount(PawnViewDialog, {
    props: { isOpen: true, pawn, ...overrides },
    global: { stubs: { MilkdownView: MilkdownViewStub } },
  });
}

describe('PawnViewDialog', () => {
  it('shows the pawn name and notes', () => {
    const wrapper = mountDialog();

    expect(wrapper.findComponent(BaseModal).props('title')).toBe('Goblin');
    expect(wrapper.findComponent(BaseModal).props('showSubmit')).toBe(false);
    expect(wrapper.text()).toContain('Fierce little creature');
    wrapper.unmount();
  });

  it('shows an empty state without notes', () => {
    const wrapper = mountDialog({ pawn: { ...pawn, notes: '' } });

    expect(wrapper.text()).toContain('No description provided');
    wrapper.unmount();
  });

  it('closes through the modal cancel action', () => {
    const wrapper = mountDialog();
    wrapper.findComponent(BaseModal).vm.$emit('cancel');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    wrapper.unmount();
  });

  it('supports expanding and opening the pawn page', async () => {
    const wrapper = mountDialog();
    const modal = wrapper.findComponent(BaseModal);

    expect(modal.props('showExpand')).toBe(true);
    expect(wrapper.find('.pawn-view-open').exists()).toBe(true);

    await wrapper.find('.pawn-view-open').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(mocks.push).toHaveBeenCalledWith('/pawns/pawn-1');
    wrapper.unmount();
  });
});
