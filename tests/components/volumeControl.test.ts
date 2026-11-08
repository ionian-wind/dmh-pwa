import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import VolumeControl from '@/components/common/VolumeControl.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

function mountControl(props: Record<string, unknown> = {}) {
  return mount(VolumeControl, {
    props: {
      modelValue: 0.5,
      label: 'Volume',
      ...props,
    },
    global: { stubs: quasarStubs },
  });
}

describe('VolumeControl', () => {
  it('shows the volume as an integer percentage', () => {
    const wrapper = mountControl({ modelValue: 0.28999999999999998 });

    expect(wrapper.find('.volume-popup-value').text()).toBe('29%');
    expect(wrapper.attributes('title')).toBe('Volume: 29%');
    expect(wrapper.attributes('aria-label')).toBe('Volume: 29%');
    wrapper.unmount();
  });

  it('adjusts volume by wheel and clamps it to 0–1', async () => {
    const wrapper = mountControl();

    await wrapper.trigger('wheel', { deltaY: 100 });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0.4]);

    await wrapper.trigger('wheel', { deltaY: -1000 });
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([1]);

    await wrapper.trigger('wheel', { deltaY: 1000 });
    expect(wrapper.emitted('update:modelValue')?.[2]).toEqual([0]);
    wrapper.unmount();
  });

  it('emits slider updates', () => {
    const wrapper = mountControl();
    const slider = wrapper.findComponent(quasarStubs.QSlider);

    slider.vm.$emit('update:modelValue', 0.25);
    slider.vm.$emit('update:modelValue', null);

    expect(wrapper.emitted('update:modelValue')).toEqual([[0.25]]);
    wrapper.unmount();
  });

  it('only toggles mute when muteable', async () => {
    const wrapper = mountControl();

    await wrapper.trigger('click');
    expect(wrapper.emitted('toggle-mute')).toBeUndefined();
    wrapper.unmount();

    const muteable = mountControl({ muteable: true });
    await muteable.trigger('click');
    expect(muteable.emitted('toggle-mute')).toHaveLength(1);
    muteable.unmount();
  });

  it('keeps the popup open while dragging its slider', async () => {
    const wrapper = mountControl();
    const popup = wrapper.find('.volume-popup');

    await wrapper.trigger('mouseenter');
    await popup.trigger('pointerdown');
    await popup.trigger('mouseleave');
    await wrapper.trigger('mouseleave');

    expect(wrapper.findComponent(quasarStubs.QPopupProxy).exists()).toBe(true);
    wrapper.unmount();
  });
});
