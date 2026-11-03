import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  loading: false,
  masterVolume: 50,
  currentPack: {
    id: 'pack-1',
    name: 'Campaign',
    moodStates: [],
    layers: [],
    oneShots: [],
    weatherSystems: [],
  },
  isPlaying: false,
  togglePlayPause: vi.fn(),
  setMasterVolume: vi.fn(),
  loadStoredPacks: vi.fn().mockResolvedValue(undefined),
  importPack: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
}));

const layoutMock = vi.hoisted(() => ({
  setTopMenuContent: vi.fn(),
}));

const rightDrawerMock = vi.hoisted(() => ({
  set: vi.fn(),
  clear: vi.fn(),
}));

const push = vi.hoisted(() => vi.fn());

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('@/composables/useLayout', () => ({
  useLayout: () => ({ setTopMenuContent: layoutMock.setTopMenuContent }),
  useRightDrawer: () => rightDrawerMock,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import AmbientSoundView from '@/ambient-sound/AmbientSoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';

const stubs = {
  QSpinnerDots: true,
  MoodStateControl: true,
  IntensitySlider: true,
  AmbientMixer: true,
  OneShotPanel: true,
  WeatherPanel: true,
};

describe('AmbientSoundView', () => {
  beforeEach(() => {
    storeMock.loading = false;
    storeMock.masterVolume = 50;
    storeMock.currentPack = {
      id: 'pack-1',
      name: 'Campaign',
      moodStates: [],
      layers: [],
      oneShots: [],
      weatherSystems: [],
    };
    layoutMock.setTopMenuContent.mockClear();
    rightDrawerMock.set.mockClear();
    rightDrawerMock.clear.mockClear();
    push.mockClear();
    storeMock.loadStoredPacks.mockClear();
    storeMock.pause.mockClear();
    storeMock.setMasterVolume.mockClear();
    storeMock.importPack.mockClear();
    storeMock.togglePlayPause.mockClear();
    storeMock.isPlaying = false;
  });

  it('uses the shared header and card layout', async () => {
    const wrapper = mount(AmbientSoundView, {
      global: { stubs },
    });
    await flushPromises();

    const header = layoutMock.setTopMenuContent.mock.calls[0][0];
    expect(header.component).toBe(ViewHeader);
    expect(header.props.title).toBe('Ambient Sound');
    expect(header.props.buttons).toBeUndefined();
    expect(rightDrawerMock.set).toHaveBeenCalledWith({
      component: SoundPackSidebar,
    });

    expect(wrapper.findAll('[data-stub="QCard"]')).toHaveLength(6);
    expect(wrapper.text()).not.toContain('Overall control');
    expect(wrapper.text()).toContain('Master volume');
    expect(wrapper.text()).toContain('50%');
    await wrapper.find('button[aria-label="Play"]').trigger('click');
    expect(storeMock.togglePlayPause).toHaveBeenCalledTimes(1);

    await wrapper
      .find('.master-volume-slider')
      .trigger('wheel', { deltaY: 100 });
    expect(storeMock.setMasterVolume).toHaveBeenCalledWith(40);

    wrapper.unmount();
    expect(layoutMock.setTopMenuContent).toHaveBeenLastCalledWith(null);
    expect(rightDrawerMock.clear).toHaveBeenCalled();
    expect(storeMock.pause).toHaveBeenCalled();
  });

  it('shows the shared empty state without a loaded pack', async () => {
    storeMock.currentPack = null as any;
    const wrapper = mount(AmbientSoundView, {
      global: { stubs },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Select Sound Pack');
    expect(wrapper.text()).toContain(
      'Open the sound pack sidebar to choose, import, or create a pack.',
    );
    expect(wrapper.findAll('[data-stub="QCard"]')).toHaveLength(0);
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows loading through the shared spinner state', () => {
    storeMock.loading = true;
    const wrapper = mount(AmbientSoundView, { global: { stubs } });

    expect(wrapper.text()).toContain('Loading sound pack...');
    expect(wrapper.findComponent({ name: 'QSpinnerDots' }).exists()).toBe(true);
    wrapper.unmount();
  });
});
