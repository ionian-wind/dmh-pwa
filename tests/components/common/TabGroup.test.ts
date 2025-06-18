import { mount } from '@vue/test-utils';
import TabGroup from '@/components/common/TabGroup.vue';

describe('TabGroup', () => {
  const tabs = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2', disabled: true },
    { id: 'tab3', label: 'Tab 3', badge: 5 }
  ];

  it('renders tab labels and badges', () => {
    const wrapper = mount(TabGroup, { props: { tabs } });
    expect(wrapper.text()).toContain('Tab 1');
    expect(wrapper.text()).toContain('Tab 2');
    expect(wrapper.text()).toContain('Tab 3');
    expect(wrapper.text()).toContain('5');
  });

  it('switches tabs and emits update:modelValue and tab-click', async () => {
    const wrapper = mount(TabGroup, { props: { tabs } });
    await wrapper.findAll('.tab-item')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('tab-click')).toBeTruthy();
  });

  it('does not switch to disabled tab', async () => {
    const wrapper = mount(TabGroup, { props: { tabs } });
    await wrapper.findAll('.tab-item')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('emits tab-close when close button is clicked', async () => {
    const wrapper = mount(TabGroup, { props: { tabs, closable: true } });
    await wrapper.findAll('.tab-close')[0].trigger('click');
    expect(wrapper.emitted('tab-close')).toBeTruthy();
  });

  it('emits tab-add when add button is clicked', async () => {
    const wrapper = mount(TabGroup, { props: { tabs, addable: true } });
    await wrapper.find('.tab-add').trigger('click');
    expect(wrapper.emitted('tab-add')).toBeTruthy();
  });

  it('renders slot content for active tab', () => {
    const wrapper = mount(TabGroup, {
      props: { tabs, modelValue: 'tab3' },
      slots: {
        default: ({ activeTab }) => `Active: ${activeTab}`
      }
    });
    expect(wrapper.text()).toContain('Active: tab3');
  });
}); 