import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

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
}));

const rightDrawerMock = vi.hoisted(() => ({
  set: vi.fn(),
  clear: vi.fn(),
}));

const routeMock = vi.hoisted(() => ({
  params: {} as Record<string, string>,
}));

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('@/composables/useLayout', () => ({
  useLayout: () => ({
    setTopMenuContent: layoutMock.setTopMenuContent,
  }),
  useRightDrawer: () => rightDrawerMock,
}));

import AmbientSoundView from '@/ambient-sound/AmbientSoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import { EntityTabsStub } from '../helpers/entityTabsStub';

const stubs = {
  QSpinnerDots: true,
  SceneList: true,
  AmbienceGallery: true,
  OneShotGallery: true,
  ScenePlayerView: true,
  EntityTabs: EntityTabsStub,
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
    storeMock.allScenes = [
      {
        pack: { id: 'pack-1', name: 'Campaign' },
        scene: { id: 'scene-1', name: 'Tavern' },
      },
    ] as any;
    routeMock.params = {};
    for (const fn of [
      storeMock.togglePlayPause,
      storeMock.toggleMusic,
      storeMock.setMasterVolume,
      storeMock.loadStoredPacks,
      storeMock.stopPreview,
      storeMock.playScene,
      storeMock.playOneShot,
      layoutMock.setTopMenuContent,
      rightDrawerMock.set,
      rightDrawerMock.clear,
      routerMock.push,
      routerMock.replace,
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
    expect(wrapper.text()).toContain('Scenes');
    expect(wrapper.text()).toContain('Ambiences');
    expect(wrapper.text()).toContain('One-shots');
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(true);
    expect(storeMock.playScene).not.toHaveBeenCalled();
    expect(storeMock.playOneShot).not.toHaveBeenCalled();

    wrapper.unmount();
    expect(layoutMock.setTopMenuContent).toHaveBeenLastCalledWith(null);
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

  it('pushes scene routes and renders the scene view from the URL', async () => {
    const listWrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    listWrapper
      .findComponent({ name: 'SceneList' })
      .vm.$emit('open', 'pack-1', 'scene-1');
    await flushPromises();
    expect(routerMock.push).toHaveBeenCalledWith({
      name: 'ambient-scene',
      params: { sceneId: 'scene-1' },
    });
    listWrapper.unmount();

    routeMock.params = { sceneId: 'scene-1' };
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    const sceneView = wrapper.findComponent({ name: 'ScenePlayerView' });
    expect(sceneView.exists()).toBe(true);
    expect(sceneView.props('packId')).toBe('pack-1');
    expect(sceneView.props('sceneId')).toBe('scene-1');
    expect(wrapper.find('.ambient-tabs-sticky').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(false);

    sceneView.vm.$emit('back');
    await flushPromises();
    expect(routerMock.push).toHaveBeenLastCalledWith({
      name: 'ambient-sound',
    });
    wrapper.unmount();
  });

  it('redirects to the ambient list when the routed scene is missing', async () => {
    routeMock.params = { sceneId: 'removed-scene' };
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    expect(routerMock.replace).toHaveBeenCalledWith({
      name: 'ambient-sound',
    });
    expect(wrapper.findComponent({ name: 'ScenePlayerView' }).exists()).toBe(
      false,
    );
    wrapper.unmount();
  });

  it('redirects when the open scene loses its package', async () => {
    routeMock.params = { sceneId: 'scene-1' };
    storeMock.allScenes = reactive([
      {
        pack: { id: 'pack-1', name: 'Campaign' },
        scene: { id: 'scene-1', name: 'Tavern' },
      },
    ]) as any;

    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();
    expect(routerMock.replace).not.toHaveBeenCalled();

    storeMock.allScenes.splice(0);
    await flushPromises();

    expect(routerMock.replace).toHaveBeenCalledWith({
      name: 'ambient-sound',
    });
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
