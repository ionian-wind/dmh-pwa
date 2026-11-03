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
}));

const layoutMock = vi.hoisted(() => ({
  setTopMenuContent: vi.fn(),
}));

const rightDrawerMock = vi.hoisted(() => ({
  set: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('@/composables/useLayout', () => ({
  useLayout: () => ({ setTopMenuContent: layoutMock.setTopMenuContent }),
  useRightDrawer: () => rightDrawerMock,
}));

import AmbientSoundView from '@/ambient-sound/AmbientSoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';

const stubs = {
  QSpinnerDots: true,
  AmbientGlobalControl: true,
  SceneList: true,
  AmbienceGallery: true,
  OneShotGallery: true,
  SceneEditorModal: true,
  ScenePlayerDialog: true,
  AddToScenePicker: true,
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
      layoutMock.setTopMenuContent,
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

    expect(wrapper.text()).toContain('Scenes');
    expect(wrapper.text()).toContain('Ambiences');
    expect(wrapper.text()).toContain('One-shots');
    expect(wrapper.findComponent({ name: 'SceneList' }).exists()).toBe(true);

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

  it('opens the scene editor and add-to-scene picker from child actions', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    const sceneList = wrapper.findComponent({ name: 'SceneList' });
    sceneList.vm.$emit('edit', 'pack-1', 'scene-1');
    sceneList.vm.$emit('create', 'pack-1');
    await flushPromises();

    const editor = wrapper.findComponent({ name: 'SceneEditorModal' });
    expect(editor.props('isOpen')).toBe(true);
    expect(editor.props('packId')).toBe('pack-1');

    const ambiencesTab = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Ambiences');
    await ambiencesTab!.trigger('click');
    await flushPromises();

    const ambienceGallery = wrapper.findComponent({ name: 'AmbienceGallery' });
    ambienceGallery.vm.$emit('add', 'pack-1', 'ambience', 'rain');
    await flushPromises();

    const picker = wrapper.findComponent({ name: 'AddToScenePicker' });
    expect(picker.props('isOpen')).toBe(true);
    expect(picker.props('packId')).toBe('pack-1');
    expect(picker.props('kind')).toBe('ambience');
    expect(picker.props('entryId')).toBe('rain');

    editor.vm.$emit('close');
    picker.vm.$emit('close');
    await flushPromises();
    expect(editor.props('isOpen')).toBe(false);
    expect(picker.props('isOpen')).toBe(false);
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
