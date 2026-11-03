import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  loading: false,
  masterVolume: 50,
  musicEnabled: true,
  isPlaying: false,
  storedPacks: [{ id: 'pack-1', name: 'Campaign' }],
  activeScene: {
    pack: { id: 'pack-1', name: 'Campaign' },
    scene: { id: 'scene-1', name: 'Tavern' },
  },
  activeSceneKey: 'pack-1::scene-1',
  hasActiveLayers: false,
  togglePlayPause: vi.fn(),
  toggleMusic: vi.fn(),
  setMasterVolume: vi.fn(),
  loadStoredPacks: vi.fn().mockResolvedValue(undefined),
  stopPreview: vi.fn(),
  playScene: vi.fn(),
  playOneShot: vi.fn(),
}));

const layoutMock = vi.hoisted(() => ({
  setTopMenuContent: vi.fn(),
  setBottomDrawerContent: vi.fn(),
}));

const rightDrawerMock = vi.hoisted(() => ({
  set: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('@/composables/useLayout', () => ({
  useLayout: () => ({
    setTopMenuContent: layoutMock.setTopMenuContent,
    setBottomDrawerContent: layoutMock.setBottomDrawerContent,
  }),
  useRightDrawer: () => rightDrawerMock,
}));

import AmbientSoundView from '@/ambient-sound/AmbientSoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import AmbientGlobalControl from '@/ambient-sound/components/AmbientGlobalControl.vue';

const stubs = {
  QSpinnerDots: true,
  SceneList: true,
  AmbienceGallery: true,
  OneShotGallery: true,
  ScenePlayerView: true,
};

describe('AmbientSoundView', () => {
  beforeEach(() => {
    storeMock.loading = false;
    storeMock.masterVolume = 50;
    storeMock.musicEnabled = true;
    storeMock.isPlaying = false;
    storeMock.hasActiveLayers = false;
    storeMock.storedPacks = [{ id: 'pack-1', name: 'Campaign' }] as any;
    storeMock.activeScene = {
      pack: { id: 'pack-1', name: 'Campaign' },
      scene: { id: 'scene-1', name: 'Tavern' },
    } as any;
    for (const fn of [
      storeMock.togglePlayPause,
      storeMock.toggleMusic,
      storeMock.setMasterVolume,
      storeMock.loadStoredPacks,
      storeMock.stopPreview,
      storeMock.playScene,
      storeMock.playOneShot,
      layoutMock.setTopMenuContent,
      layoutMock.setBottomDrawerContent,
      rightDrawerMock.set,
      rightDrawerMock.clear,
    ]) {
      fn.mockClear();
    }
  });

  it('renders the scene/gallery tabs and playback controls', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    const header = layoutMock.setTopMenuContent.mock.calls[0][0];
    expect(header.component).toBe(ViewHeader);
    expect(header.props.title).toBe('Ambient Sound');
    expect(rightDrawerMock.set).toHaveBeenCalledWith({
      component: SoundPackSidebar,
    });
    expect(layoutMock.setBottomDrawerContent).toHaveBeenCalledWith({
      component: AmbientGlobalControl,
    });

    expect(wrapper.text()).toContain('Scenes');
    expect(wrapper.text()).toContain('Ambiences');
    expect(wrapper.text()).toContain('One-shots');
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(true);
    expect(storeMock.playScene).not.toHaveBeenCalled();
    expect(storeMock.playOneShot).not.toHaveBeenCalled();

    wrapper.unmount();
    expect(layoutMock.setTopMenuContent).toHaveBeenLastCalledWith(null);
    expect(layoutMock.setBottomDrawerContent).toHaveBeenLastCalledWith(null);
    expect(rightDrawerMock.clear).toHaveBeenCalled();
    expect(storeMock.stopPreview).toHaveBeenCalled();
  });

  it('switches tabs between scenes and the global galleries', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    const ambiencesTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Ambiences');
    await ambiencesTab!.trigger('click');
    expect(wrapper.findComponent({ name: 'AmbienceGallery' }).exists()).toBe(
      true,
    );

    const oneShotTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'One-shots');
    await oneShotTab!.trigger('click');
    expect(wrapper.findComponent({ name: 'OneShotGallery' }).exists()).toBe(
      true,
    );
    wrapper.unmount();
  });

  it('replaces the page content with the scene view and returns with back', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    const sceneList = wrapper.findComponent({ name: 'SceneList' });
    sceneList.vm.$emit('open', 'pack-1', 'scene-1');
    await flushPromises();

    const sceneView = wrapper.findComponent({ name: 'ScenePlayerView' });
    expect(sceneView.exists()).toBe(true);
    expect(sceneView.props('packId')).toBe('pack-1');
    expect(sceneView.props('sceneId')).toBe('scene-1');
    expect(wrapper.find('.ambient-tabs-sticky').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(false);

    sceneView.vm.$emit('back');
    await flushPromises();

    expect(wrapper.findComponent({ name: 'ScenePlayerView' }).exists()).toBe(
      false,
    );
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(true);
    expect(wrapper.find('.ambient-tabs-sticky').exists()).toBe(true);
    wrapper.unmount();
  });

  it('shows the empty import state without packages', async () => {
    storeMock.storedPacks = [] as any;
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    expect(wrapper.text()).toContain('Import Pack');
    expect(wrapper.text()).toContain('Import a package');
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows loading through the shared spinner state', () => {
    storeMock.loading = true;
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    expect(wrapper.text()).toContain('Loading sound pack...');
    wrapper.unmount();
  });
});
