import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import PopoverPanelDemo from '@/components/common/PopoverPanelDemo.vue';

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
});
