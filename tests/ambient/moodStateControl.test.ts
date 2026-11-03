import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  currentPack: null as any,
  currentMoodState: 'explore',
  musicEnabled: true,
  setMoodState: vi.fn(),
  setMusicEnabled: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import MoodStateControl from '@/ambient-sound/components/MoodStateControl.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('MoodStateControl', () => {
  beforeEach(() => {
    storeMock.currentPack = {
      moodStates: [
        { state: 'explore', name: 'Explore', icon: '🔍' },
        { state: 'combat', name: 'Combat', icon: '⚔️' },
      ],
    };
    storeMock.currentMoodState = 'explore';
    storeMock.musicEnabled = true;
    storeMock.setMoodState.mockClear();
    storeMock.setMusicEnabled.mockClear();
  });

  it('selects moods and toggles music in the same block', async () => {
    const wrapper = mount(MoodStateControl);

    const toggle = wrapper.findComponent(quasarStubs.QToggle);
    expect(toggle.props('modelValue')).toBe(true);
    toggle.vm.$emit('update:modelValue', false);
    expect(storeMock.setMusicEnabled).toHaveBeenCalledWith(false);

    const combat = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Combat'));
    expect(combat).toBeTruthy();
    await combat!.trigger('click');
    expect(storeMock.setMoodState).toHaveBeenCalledWith('combat');
    wrapper.unmount();
  });
});
