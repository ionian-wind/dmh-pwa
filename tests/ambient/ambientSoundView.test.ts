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
  setMasterVolume: vi.fn(),
  loadStoredPacks: vi.fn().mockResolvedValue(undefined),
  importPack: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
}));

const layoutMock = vi.hoisted(() => ({
  setTopMenuContent: vi.fn(),
}));

const push = vi.hoisted(() => vi.fn());

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('@/composables/useLayout', () => ({
  useLayout: () => ({ setTopMenuContent: layoutMock.setTopMenuContent }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import AmbientSoundView from '@/ambient-sound/AmbientSoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';

const stubs = {
  QSpinnerDots: true,
  SoundPackSelector: true,
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
    push.mockClear();
    storeMock.loadStoredPacks.mockClear();
    storeMock.pause.mockClear();
    storeMock.setMasterVolume.mockClear();
    storeMock.importPack.mockClear();
  });

  it('uses the shared header and card layout', async () => {
    const wrapper = mount(AmbientSoundView, {
      global: { stubs },
    });
    await flushPromises();

    const header = layoutMock.setTopMenuContent.mock.calls[0][0];
    expect(header.component).toBe(ViewHeader);
    expect(header.props.title).toBe('Ambient Sound');
    expect(header.props.buttons.map((button: any) => button.title)).toEqual([
      'ambientSoundPage.createPack',
      'ambientSoundPage.importPack',
    ]);

    expect(wrapper.findAll('[data-stub="QCard"]')).toHaveLength(7);
    expect(wrapper.text()).toContain('Master volume');
    expect(wrapper.text()).toContain('50%');

    header.props.buttons[0].event();
    expect(push).toHaveBeenCalledWith('/ambient-sound/editor');

    const click = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => undefined);
    header.props.buttons[1].event();
    expect(click).toHaveBeenCalled();
    click.mockRestore();

    wrapper.unmount();
    expect(layoutMock.setTopMenuContent).toHaveBeenLastCalledWith(null);
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
      'Import a .spk sound pack file to get started',
    );
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
