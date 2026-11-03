import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import TabGroup from '@/components/common/TabGroup.vue';

describe('TabGroup', () => {
  it('translates keys but leaves already-translated labels intact', () => {
    const wrapper = mount(TabGroup, {
      props: {
        tabs: [
          { id: 'toc', label: 'common.tableOfContents' },
          { id: 'bookmarks', label: 'Оглавление' },
        ],
      },
    });

    const labels = wrapper.findAll('.tab-label').map((label) => label.text());
    expect(labels[0]).toBe('Table of Contents');
    expect(labels[1]).toBe('Оглавление');
    wrapper.unmount();
  });

  it('activates tabs, ignores disabled tabs and emits close/add events', async () => {
    const tabs = [
      { id: 'one', label: 'One', icon: '★' },
      { id: 'two', label: 'Two', badge: 2 },
      { id: 'three', label: 'Three', disabled: true },
    ];
    const wrapper = mount(TabGroup, {
      props: {
        tabs,
        modelValue: 'one',
        closable: true,
        addable: true,
        variant: 'pills',
        size: 'lg',
        fullWidth: true,
        vertical: true,
        align: 'center',
        titleAlign: 'right',
      },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        'tab-group--pills',
        'tab-group--lg',
        'tab-group--full-width',
        'tab-group--vertical',
      ]),
    );
    expect(wrapper.find('.tab-nav--pills').exists()).toBe(true);
    expect(wrapper.find('.tab-nav-align--center').exists()).toBe(true);
    expect(wrapper.find('.tab-title-align--right').exists()).toBe(true);

    const items = wrapper.findAll('.tab-item');
    await items[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    await items[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['two']);
    expect(wrapper.emitted('tab-click')?.[0]).toEqual([tabs[1]]);

    await items[2].trigger('click');
    expect(wrapper.emitted('tab-click')).toHaveLength(1);

    await wrapper.findAll('.tab-close')[0].trigger('click');
    expect(wrapper.emitted('tab-close')?.[0]).toEqual(['one']);
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);

    await wrapper.find('.tab-add').trigger('click');
    expect(wrapper.emitted('tab-add')).toHaveLength(1);
    wrapper.unmount();
  });

  it('auto-selects the first enabled tab when the active one disappears', async () => {
    const wrapper = mount(TabGroup, {
      props: {
        tabs: [{ id: 'one', label: 'One' }],
        modelValue: 'one',
      },
    });

    await wrapper.setProps({
      tabs: [
        { id: 'disabled', label: 'Disabled', disabled: true },
        { id: 'next', label: 'Next' },
      ],
    });
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['next']);

    await wrapper.setProps({
      tabs: [{ id: 'only-disabled', label: 'Only', disabled: true }],
    });
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
    wrapper.unmount();
  });

  it('falls back to no active tab when the list is empty', () => {
    const wrapper = mount(TabGroup, {
      props: { tabs: [], modelValue: '' },
    });
    expect(wrapper.find('.tab-item').exists()).toBe(false);
    wrapper.unmount();
  });
});
