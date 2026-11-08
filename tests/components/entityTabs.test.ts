import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

import EntityTabs from '@/components/common/EntityTabs.vue';

const QTabsStub = defineComponent({
  name: 'QTabs',
  props: { modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  setup(_, { slots, emit }) {
    return () =>
      h('div', { class: 'qtabs-stub' }, [
        h(
          'button',
          {
            class: 'change-tab',
            onClick: () => emit('update:modelValue', 'two'),
          },
          'change',
        ),
        slots.default?.(),
      ]);
  },
});

const QTabStub = defineComponent({
  name: 'QTab',
  props: {
    name: { type: String, default: '' },
    label: { type: String, default: '' },
    disable: Boolean,
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          class: 'tab-stub',
          disabled: props.disable,
          onClick: () => emit('click'),
        },
        props.label,
      );
  },
});

const stubs = { QTabs: QTabsStub, QTab: QTabStub };

describe('EntityTabs', () => {
  const tabs = [
    { id: 'one', label: 'One' },
    { id: 'two', label: 'Two', disabled: true },
  ];

  it('renders labels, defaults to the first tab and forwards updates', async () => {
    const wrapper = mount(EntityTabs, {
      props: { tabs },
      global: { stubs },
    });

    expect(wrapper.text()).toContain('One');
    expect(wrapper.text()).toContain('Two');
    expect(wrapper.findComponent(QTabsStub).props('modelValue')).toBe('one');
    expect(
      wrapper.findAll('.tab-stub')[1].attributes('disabled'),
    ).toBeDefined();

    await wrapper.find('.change-tab').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['two']);
    wrapper.unmount();
  });

  it('forwards tab clicks', async () => {
    const wrapper = mount(EntityTabs, {
      props: { tabs, modelValue: 'one' },
      global: { stubs },
    });

    await wrapper.findAll('.tab-stub')[0].trigger('click');
    expect(wrapper.emitted('tab-click')?.[0]).toEqual([tabs[0]]);
    wrapper.unmount();
  });
});
