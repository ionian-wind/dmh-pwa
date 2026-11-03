import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';

describe('AmbientIcon', () => {
  it('renders RPG Awesome icons through the shared marker helper', () => {
    const wrapper = mount(AmbientIcon, {
      props: { icon: 'ra-rain', size: 24 },
    });
    expect(wrapper.find('i.ra').exists()).toBe(true);
    expect(wrapper.text()).toBe('');
    wrapper.unmount();
  });

  it('renders Font Awesome icons in icon-picker format', () => {
    const wrapper = mount(AmbientIcon, {
      props: { icon: 'fa-solid:cloud-rain', size: 24 },
    });
    const icon = wrapper.find('i');
    expect(icon.classes()).toContain('fa-solid');
    expect(icon.classes()).toContain('fa-cloud-rain');
    expect(wrapper.text()).toBe('');
    wrapper.unmount();
  });

  it('renders emoji and default icons as text', () => {
    const emoji = mount(AmbientIcon, { props: { icon: '🌧️' } });
    expect(emoji.text()).toBe('🌧️');
    emoji.unmount();

    const fallback = mount(AmbientIcon);
    expect(fallback.text()).toBe('🎵');
    fallback.unmount();
  });
});
