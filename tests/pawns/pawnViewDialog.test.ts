import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import PawnViewDialog from '@/pawns/PawnViewDialog.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import type { Pawn } from '@/types';

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
});
