import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import PartyEditor from '@/parties/PartyEditor.vue';
import BaseModal from '@/components/common/BaseModal.vue';

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: { kind: String, modelValue: Array },
  emits: ['update:modelValue'],
  setup(props) {
    return () =>
      h('div', {
        class: 'entities-linking-stub',
        'data-kind': props.kind,
        'data-count': props.modelValue?.length ?? 0,
      });
  },
});

const party = {
  id: 'p1',
  name: 'The Company',
  description: 'Adventurers',
  notes: '',
  characters: ['c1'],
  moduleIds: ['m1'],
  createdAt: 1,
  updatedAt: 1,
};

function linkingBlock(wrapper: ReturnType<typeof mount>, kind: string) {
  return wrapper
    .findAllComponents(EntitiesLinkingStub)
    .find((entry) => entry.props('kind') === kind)!;
}

describe('entity editor tabs', () => {
  it('separates party fields and typed linking blocks', async () => {
    const wrapper = mount(PartyEditor, {
      props: { party, isOpen: true },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    await nextTick();

    const tabs = wrapper.findComponent(BaseModal).props('tabs') as Array<{
      name: string;
    }>;
    expect(tabs.map((tab) => tab.name)).toEqual(['main', 'links']);

    expect(
      wrapper
        .findAllComponents(EntitiesLinkingStub)
        .map((block) => block.props('kind')),
    ).toEqual(['module', 'character']);

    linkingBlock(wrapper, 'module').vm.$emit('update:modelValue', [
      { kind: 'module', id: 'm2' },
    ]);
    linkingBlock(wrapper, 'character').vm.$emit('update:modelValue', [
      { kind: 'character', id: 'c2' },
      { kind: 'character', id: 'c3' },
    ]);
    await nextTick();

    wrapper.findComponent(BaseModal).vm.$emit('submit');

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      moduleIds: ['m2'],
      characters: ['c2', 'c3'],
    });
  });
});
