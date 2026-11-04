import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  masterVolume: 50,
  moodVolume: 60,
  ambienceVolume: 70,
  oneShotVolume: 80,
  setMasterVolume: vi.fn(),
  setMoodVolume: vi.fn(),
  setAmbienceVolume: vi.fn(),
  setOneShotVolume: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import AmbientVolumeDialog from '@/ambient-sound/components/AmbientVolumeDialog.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

describe('AmbientVolumeDialog', () => {
  beforeEach(() => {
    storeMock.masterVolume = 50;
    storeMock.moodVolume = 60;
    storeMock.ambienceVolume = 70;
    storeMock.oneShotVolume = 80;
    for (const fn of [
      storeMock.setMasterVolume,
      storeMock.setMoodVolume,
      storeMock.setAmbienceVolume,
      storeMock.setOneShotVolume,
    ]) {
      fn.mockReset();
    }
  });

  it('shows master, mood, ambience and one-shot volume controls', () => {
    const wrapper = mount(AmbientVolumeDialog, {
      props: { modelValue: true },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.find('.volume-dialog-card').exists()).toBe(true);
    expect(wrapper.text()).toContain('Master volume');
    expect(wrapper.text()).toContain('Mood volume');
    expect(wrapper.text()).toContain('Ambience volume');
    expect(wrapper.text()).toContain('One-shot volume');
    expect(wrapper.text()).toContain('50%');
    expect(wrapper.text()).toContain('60%');
    expect(wrapper.text()).toContain('70%');
    expect(wrapper.text()).toContain('80%');
    expect(wrapper.findAllComponents(quasarStubs.QSlider)).toHaveLength(4);
    wrapper.unmount();
  });

  it('updates each volume level through its slider', () => {
    const wrapper = mount(AmbientVolumeDialog, {
      props: { modelValue: true },
      global: { stubs: quasarStubs },
    });

    const sliders = wrapper.findAllComponents(quasarStubs.QSlider);
    sliders[0].vm.$emit('update:modelValue', 0.4);
    sliders[1].vm.$emit('update:modelValue', 0.5);
    sliders[2].vm.$emit('update:modelValue', 0.6);
    sliders[3].vm.$emit('update:modelValue', 0.7);

    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(40);
    expect(storeMock.setMoodVolume).toHaveBeenCalledWith(50);
    expect(storeMock.setAmbienceVolume).toHaveBeenCalledWith(60);
    expect(storeMock.setOneShotVolume).toHaveBeenCalledWith(70);
    wrapper.unmount();
  });

  it('adjusts each control with the mouse wheel', async () => {
    const wrapper = mount(AmbientVolumeDialog, {
      props: { modelValue: true },
      global: { stubs: quasarStubs },
    });

    const rows = wrapper.findAll('.volume-row');
    await rows[0].trigger('wheel', { deltaY: -100 });
    await rows[1].trigger('wheel', { deltaY: 100 });
    await rows[2].trigger('wheel', { deltaY: -100 });
    await rows[3].trigger('wheel', { deltaY: 100 });

    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(55);
    expect(storeMock.setMoodVolume).toHaveBeenCalledWith(55);
    expect(storeMock.setAmbienceVolume).toHaveBeenCalledWith(75);
    expect(storeMock.setOneShotVolume).toHaveBeenCalledWith(75);
    wrapper.unmount();
  });

  it('renders nothing while closed', () => {
    const wrapper = mount(AmbientVolumeDialog, {
      props: { modelValue: false },
      global: { stubs: quasarStubs },
    });

    expect(wrapper.find('.volume-dialog-card').exists()).toBe(false);
    wrapper.unmount();
  });
});
