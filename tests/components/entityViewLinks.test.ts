import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import EntityViewLinks from '@/components/common/EntityViewLinks.vue';

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: {
    kind: String,
    modelValue: Array,
    readonly: Boolean,
  },
  setup(props) {
    return () =>
      h('div', {
        class: 'entities-linking-stub',
        'data-kind': props.kind,
        'data-readonly': String(props.readonly),
        'data-count': props.modelValue?.length ?? 0,
      });
  },
});

describe('EntityViewLinks', () => {
  it('renders one read-only block per linked kind', () => {
    const links = [
      { kind: 'module', id: 'm1' },
      { kind: 'character', id: 'c1' },
      { kind: 'module', id: 'm2' },
    ];
    const wrapper = mount(EntityViewLinks, {
      props: { links: links as any },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    const blocks = wrapper.findAllComponents(EntitiesLinkingStub);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].props('kind')).toBe('module');
    expect(blocks[0].props('readonly')).toBe(true);
    expect(blocks[0].props('modelValue')).toEqual(links);
    expect(blocks[1].props('kind')).toBe('character');
    expect(blocks[1].props('readonly')).toBe(true);
    wrapper.unmount();
  });

  it('shows the empty state when there are no links', () => {
    const wrapper = mount(EntityViewLinks, {
      props: { links: [] },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    expect(wrapper.find('.entities-linking-stub').exists()).toBe(false);
    expect(wrapper.text()).toContain('No linked entities');
    wrapper.unmount();
  });
});
