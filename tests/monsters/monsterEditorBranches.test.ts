import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import MonsterEditor from '@/monsters/MonsterEditor.vue';
import BaseModal from '@/components/common/BaseModal.vue';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

const alertMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/dialogs', () => ({ alert: alertMock }));

const EntitiesLinkingStub = {
  name: 'EntitiesLinking',
  props: ['kind', 'modelValue'],
  emits: ['update:modelValue'],
  template: '<div class="entities-linking-stub" />',
};

describe('MonsterEditor branches', () => {
  it('validates and resets the form', async () => {
    const wrapper = mount(MonsterEditor, {
      props: { isOpen: true, monster: null },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(alertMock).toHaveBeenCalled();

    const monster = {
      id: 'm1',
      name: 'Goblin',
      notes: '',
      createdAt: 1,
      updatedAt: 1,
    };
    const linked = mount(MonsterEditor, {
      props: { isOpen: true, monster: monster as any },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    linked.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(linked.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Goblin',
    });

    await linked.setProps({ isOpen: false });
    await linked.setProps({ isOpen: true, monster: null });
    linked.findComponent(BaseModal).vm.$emit('cancel');
    expect(linked.emitted('cancel')?.length).toBeGreaterThanOrEqual(1);
    wrapper.unmount();
    linked.unmount();
  });
});
