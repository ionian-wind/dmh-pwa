import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import EntityGroup from '@/components/common/EntityGroup.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('EntityGroup', () => {
  it('renders its title, actions slot and content', () => {
    const wrapper = mount(EntityGroup, {
      props: { title: 'Modules' },
      slots: {
        actions: '<button class="group-add">Add</button>',
        default: '<div class="group-content">Body</div>',
      },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.find('.entity-group').exists()).toBe(true);
    expect(wrapper.text()).toContain('Modules');
    expect(wrapper.find('.group-add').exists()).toBe(true);
    expect(wrapper.find('.group-content').text()).toBe('Body');
    wrapper.unmount();
  });
});
