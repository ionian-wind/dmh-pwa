import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  IconLoader2,
  IconPercentage0,
  IconPercentage10,
  IconPercentage100,
  IconPercentage20,
  IconPercentage25,
  IconPercentage30,
  IconPercentage33,
  IconPercentage40,
  IconPercentage50,
  IconPercentage60,
  IconPercentage66,
  IconPercentage70,
  IconPercentage75,
  IconPercentage80,
  IconPercentage90,
} from '@tabler/icons-vue';

import ProgressButton from '@/components/common/ProgressButton.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

function mountButton(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
) {
  return mount(ProgressButton, {
    props,
    slots,
    global: { stubs: quasarStubs },
  });
}

describe('ProgressButton', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders its default content in the none state', () => {
    const wrapper = mountButton({}, { default: 'Start' });

    expect(wrapper.text()).toBe('Start');
    expect(wrapper.find('.progress-button-progress').exists()).toBe(false);
    expect(wrapper.find('.progress-button-spinner').exists()).toBe(false);
    expect(wrapper.attributes('aria-busy')).toBeUndefined();
    wrapper.unmount();
  });

  it('shows a spinning loader while loading', () => {
    const wrapper = mountButton({ state: 'loading', percent: 100 });

    expect(wrapper.findComponent(IconLoader2).exists()).toBe(true);
    expect(wrapper.find('.progress-button-spinner').exists()).toBe(true);
    expect(wrapper.findComponent(IconPercentage100).exists()).toBe(false);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    wrapper.unmount();
  });

  it.each([
    [0, IconPercentage0],
    [9, IconPercentage10],
    [12, IconPercentage10],
    [20, IconPercentage20],
    [24, IconPercentage25],
    [30, IconPercentage30],
    [34, IconPercentage33],
    [40, IconPercentage40],
    [45, IconPercentage40],
    [50, IconPercentage50],
    [60, IconPercentage60],
    [65, IconPercentage66],
    [70, IconPercentage70],
    [76, IconPercentage75],
    [80, IconPercentage80],
    [90, IconPercentage90],
    [100, IconPercentage100],
  ])('maps %i%% to the closest percentage icon', (percent, icon) => {
    const wrapper = mountButton({ state: 'playing', percent });

    expect(wrapper.findComponent(icon).exists()).toBe(true);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    wrapper.unmount();
  });

  it('clamps percent values to 0–100', () => {
    const low = mountButton({ state: 'playing', percent: -20 });
    expect(low.findComponent(IconPercentage0).exists()).toBe(true);
    low.unmount();

    const high = mountButton({ state: 'playing', percent: 140 });
    expect(high.findComponent(IconPercentage100).exists()).toBe(true);
    high.unmount();
  });

  it('keeps the label visible alongside the progress icon', () => {
    const wrapper = mountButton(
      { state: 'playing', percent: 50 },
      { default: 'Mood' },
    );

    expect(wrapper.text()).toContain('Mood');
    expect(wrapper.findComponent(IconPercentage50).exists()).toBe(true);
    wrapper.unmount();
  });

  it('fades a finished icon before switching to none', async () => {
    vi.useFakeTimers();
    const wrapper = mountButton(
      { state: 'playing', percent: 100 },
      { default: 'Done' },
    );
    await nextTick();

    expect(wrapper.find('.progress-button-progress').classes()).toContain(
      'is-finishing',
    );
    expect(wrapper.findComponent(IconPercentage100).exists()).toBe(true);
    expect(wrapper.emitted('update:state')).toBeUndefined();

    vi.advanceTimersByTime(249);
    await nextTick();
    expect(wrapper.emitted('update:state')).toBeUndefined();

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(wrapper.emitted('update:state')).toEqual([['none']]);
    expect(wrapper.emitted('finish')).toHaveLength(1);
    expect(wrapper.find('.progress-button-progress').exists()).toBe(false);
    expect(wrapper.text()).toBe('Done');
    wrapper.unmount();
  });

  it('cancels the finish fade when progress drops below 100', async () => {
    vi.useFakeTimers();
    const wrapper = mountButton({ state: 'playing', percent: 100 });
    await nextTick();

    vi.advanceTimersByTime(100);
    await wrapper.setProps({ percent: 60 });
    vi.advanceTimersByTime(500);
    await nextTick();

    expect(wrapper.emitted('update:state')).toBeUndefined();
    expect(wrapper.find('.progress-button-progress').classes()).not.toContain(
      'is-finishing',
    );
    expect(wrapper.findComponent(IconPercentage60).exists()).toBe(true);
    wrapper.unmount();
  });
});
