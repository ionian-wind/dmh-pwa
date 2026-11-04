import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  isPlaying: true,
  musicProgress: vi.fn(() => 0),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import MoodProgress from '@/ambient-sound/components/MoodProgress.vue';
import ProgressIndicator from '@/components/common/ProgressIndicator.vue';

describe('MoodProgress', () => {
  beforeEach(() => {
    storeMock.isPlaying = true;
    storeMock.musicProgress.mockReset();
    storeMock.musicProgress.mockReturnValue(0);
  });

  it('shows the mood label and progress indicator while active', () => {
    const wrapper = mount(MoodProgress, {
      props: { label: 'Victory', active: true },
    });

    const indicator = wrapper.findComponent(ProgressIndicator);
    expect(indicator.props('state')).toBe('playing');
    expect(indicator.props('percent')).toBe(0);
    expect(wrapper.text()).toContain('Victory');
    wrapper.unmount();
  });

  it('tracks music progress while active', async () => {
    let rafCallback: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafCallback = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    storeMock.musicProgress.mockReturnValue(0.5);

    const wrapper = mount(MoodProgress, {
      props: { label: 'Victory', active: true },
    });

    expect(rafCallback).toBeTruthy();
    rafCallback!();
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent(ProgressIndicator).props('percent')).toBe(50);
    wrapper.unmount();
    vi.unstubAllGlobals();
  });

  it('shows no progress when inactive or paused', () => {
    const inactive = mount(MoodProgress, {
      props: { label: 'Victory', active: false },
    });
    expect(inactive.findComponent(ProgressIndicator).props('state')).toBe(
      'none',
    );
    inactive.unmount();

    storeMock.isPlaying = false;
    const paused = mount(MoodProgress, {
      props: { label: 'Victory', active: true },
    });
    expect(paused.findComponent(ProgressIndicator).props('state')).toBe('none');
    paused.unmount();
  });
});
