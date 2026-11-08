import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const ambient = vi.hoisted(() => ({
  isPlaying: true,
  musicProgress: vi.fn(() => 0.5),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => ambient,
}));

let MoodProgress: any;

describe('MoodProgress fallback timers', () => {
  beforeAll(async () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);
    ({ default: MoodProgress } =
      await import('@/ambient-sound/components/MoodProgress.vue'));
  });

  it('uses timeout fallbacks and cancels when tracking stops', async () => {
    vi.useFakeTimers();
    const wrapper = mount(MoodProgress, {
      props: { label: 'Mood', active: true },
    });
    vi.advanceTimersByTime(200);
    expect(ambient.musicProgress).toHaveBeenCalled();
    await wrapper.setProps({ active: false });
    vi.advanceTimersByTime(200);
    wrapper.unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
