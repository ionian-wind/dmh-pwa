import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SidebarItem from '@/components/common/SidebarItem.vue';

describe('SidebarItem', () => {
  it('renders title, side color and all slots', () => {
    const wrapper = mount(SidebarItem, {
      props: { title: 'Castle', color: '#cc3333' },
      slots: {
        left: '<span class="left-control">icon</span>',
        default: '<p class="description">Old castle</p>',
        actions: '<button class="action">edit</button>',
      },
    });

    const root = wrapper.find('.sidebar-item');
    expect(root.attributes('style')).toContain('border-left: 4px solid');
    expect(root.text()).toContain('Castle');
    expect(wrapper.find('.left-control').exists()).toBe(true);
    expect(wrapper.find('.description').text()).toBe('Old castle');
    expect(wrapper.find('.action').exists()).toBe(true);
    wrapper.unmount();
  });

  it('omits optional slots and side color when not provided', () => {
    const wrapper = mount(SidebarItem, {
      props: { title: 'Plain item' },
    });

    const root = wrapper.find('.sidebar-item');
    expect(root.attributes('style') ?? '').not.toContain('border-left');
    expect(wrapper.find('.sidebar-item-left').exists()).toBe(false);
    expect(wrapper.find('.sidebar-item-actions').exists()).toBe(false);
    wrapper.unmount();
  });
});
