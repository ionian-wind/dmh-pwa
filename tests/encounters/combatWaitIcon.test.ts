import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CombatWaitIcon from '@/encounters/CombatWaitIcon.vue';

describe('CombatWaitIcon', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cycles hourglass icons, rotates, then reverses the sequence', async () => {
    const wrapper = mount(CombatWaitIcon, {
      props: { label: 'Waiting for turn' },
    });

    expect(wrapper.attributes('aria-label')).toBe('Waiting for turn');
    expect(wrapper.find('.tabler-icon-hourglass-high').exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.find('svg.tabler-icon-hourglass').exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.find('.tabler-icon-hourglass-low').exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.classes()).toContain('combat-wait-icon--rotating');

    await vi.advanceTimersByTimeAsync(600);
    expect(wrapper.find('svg.tabler-icon-hourglass').exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.find('.tabler-icon-hourglass-high').exists()).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    expect(wrapper.classes()).toContain('combat-wait-icon--rotating');
    wrapper.unmount();
  });
});
