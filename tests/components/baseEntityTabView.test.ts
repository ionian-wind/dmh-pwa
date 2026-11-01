import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import BaseEntityTabView from '@/components/common/BaseEntityTabView.vue';

const BaseEntityViewStub = defineComponent({
  name: 'BaseEntityView',
  setup(_, { slots }) {
    return () =>
      h('div', [
        slots.default?.(),
        slots.actions?.(),
        slots.sub?.(),
        slots.sidepanel?.(),
        slots.editor?.(),
      ]);
  },
});

function mountTabView(props: Record<string, any> = {}) {
  return mount(BaseEntityTabView, {
    props: {
      entity: { id: 'e1' },
      entityName: 'Entity',
      listRoute: '/entities',
      tabs: [
        { id: 'one', label: 'One' },
        { id: 'two', label: 'Two', disabled: true },
      ],
      ...props,
    },
    global: { stubs: { BaseEntityView: BaseEntityViewStub } },
    slots: {
      one: 'One panel',
      two: 'Two panel',
      actions: 'Actions',
      sub: 'Sub',
      sidepanel: 'Side',
      editor: 'Editor',
    },
  });
}

describe('BaseEntityTabView', () => {
  it('renders tabs, slots and forwards tab events', async () => {
    const wrapper = mountTabView();
    expect(wrapper.text()).toContain('One');
    expect(wrapper.text()).toContain('Two');
    expect(wrapper.text()).toContain('Actions');
    expect(wrapper.text()).toContain('Sub');
    expect(wrapper.text()).toContain('Side');
    expect(wrapper.text()).toContain('Editor');

    const vm = wrapper.vm as any;
    vm.handleTabUpdate('two');
    vm.handleTabClick({ id: 'one', label: 'One' });
    vm.handleTabClose('one');
    vm.handleTabAdd();
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['two']);
    expect(wrapper.emitted('tab-click')?.[0]).toEqual([
      { id: 'one', label: 'One' },
    ]);
    expect(wrapper.emitted('tab-close')?.[0]).toEqual(['one']);
    expect(wrapper.emitted('tab-add')).toHaveLength(1);
  });

  it('follows the model value and falls back to the first enabled tab', async () => {
    const wrapper = mountTabView({ modelValue: 'one' });
    await wrapper.setProps({ modelValue: 'two' });
    await nextTick();
    expect((wrapper.vm as any).activeTab).toBe('two');

    await wrapper.setProps({
      tabs: [
        { id: 'three', label: 'Three', disabled: true },
        { id: 'four', label: 'Four' },
      ],
    });
    await nextTick();
    expect((wrapper.vm as any).activeTab).toBe('four');
  });

  it('keeps the active tab when every tab is disabled and emits side panel updates', async () => {
    const wrapper = mountTabView();
    await wrapper.setProps({
      tabs: [{ id: 'five', label: 'Five', disabled: true }],
    });
    await nextTick();
    expect((wrapper.vm as any).activeTab).toBe('one');

    wrapper.findComponent(BaseEntityViewStub).vm.$emit(
      'update:sidePanelVisible',
      false,
    );
    expect(wrapper.emitted('update:sidePanelVisible')?.[0]).toEqual([false]);
    wrapper.unmount();
  });
});
