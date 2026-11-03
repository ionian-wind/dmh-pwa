import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import PopoverPanelDemo from '@/components/common/PopoverPanelDemo.vue';
import PopoverPanel from '@/components/common/PopoverPanel.vue';

describe('PopoverPanelDemo', () => {
  it('renders the demo sections and toggles a popover trigger', async () => {
    const wrapper = mount(PopoverPanelDemo);
    expect(wrapper.find('.popover-demo').exists()).toBe(true);
    expect(wrapper.text()).toContain('Popover');

    const trigger = wrapper.find('.hover-trigger');
    expect(trigger.exists()).toBe(true);
    await trigger.trigger('mouseenter');
    wrapper.unmount();
  });

  it('wires every demo popover open, close and click handler', async () => {
    const wrapper = mount(PopoverPanelDemo);
    const panels = wrapper.findAllComponents(PopoverPanel);
    expect(panels.length).toBeGreaterThanOrEqual(12);

    for (const panel of panels) {
      panel.vm.$emit('open');
      panel.vm.$emit('close');
    }

    for (const button of wrapper.findAll('button')) {
      await button.trigger('click');
    }

    expect(wrapper.find('.placement-demo').exists()).toBe(true);
    expect(wrapper.findAll('button').length).toBeGreaterThan(0);
    wrapper.unmount();
  });
});
