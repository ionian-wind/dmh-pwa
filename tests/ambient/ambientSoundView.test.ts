import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  loading: false,
  storedPacks: [{ id: 'pack-1', name: 'Campaign' }],
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

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
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
  EntityTabs: EntityTabsStub,
};

describe('AmbientSoundView', () => {
  beforeEach(() => {
    storeMock.loading = false;
    storeMock.storedPacks = [{ id: 'pack-1', name: 'Campaign' }] as any;
    for (const fn of [
      storeMock.loadStoredPacks,
      storeMock.stopPreview,
      layoutMock.setTopMenuContent,
      rightDrawerMock.set,
      rightDrawerMock.clear,
      routerMock.push,
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

  it('pushes the scene route when a scene is opened', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    wrapper
      .findComponent({ name: 'SceneList' })
      .vm.$emit('open', 'pack-1', 'scene-1');
    await flushPromises();
    expect(routerMock.push).toHaveBeenCalledWith({
      name: 'ambient-scene',
      params: { sceneId: 'scene-1' },
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
