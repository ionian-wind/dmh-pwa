import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

const storeMock = vi.hoisted(() => ({
  loading: false,
  allScenes: [] as any[],
  loadStoredPacks: vi.fn().mockResolvedValue(undefined),
}));

const layoutMock = vi.hoisted(() => ({
  setTopMenuContent: vi.fn(),
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
}));

import AmbientSceneView from '@/ambient-sound/AmbientSceneView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';

const stubs = {
  QSpinnerDots: true,
  ScenePlayerView: true,
};

describe('AmbientSceneView', () => {
  beforeEach(() => {
    storeMock.loading = false;
    storeMock.allScenes = [
      {
        pack: { id: 'pack-1', name: 'Forest' },
        scene: { id: 'scene-1', name: 'Tavern' },
      },
    ] as any;
    routeMock.params = { sceneId: 'scene-1' };
    for (const fn of [
      storeMock.loadStoredPacks,
      layoutMock.setTopMenuContent,
      routerMock.push,
      routerMock.replace,
    ]) {
      fn.mockClear();
    }
  });

  it('renders the scene player as a standalone page with the scene title', async () => {
    const wrapper = mount(AmbientSceneView, { global: { stubs } });
    await flushPromises();

    const player = wrapper.findComponent({ name: 'ScenePlayerView' });
    expect(player.exists()).toBe(true);
    expect(player.props('packId')).toBe('pack-1');
    expect(player.props('sceneId')).toBe('scene-1');
    expect(layoutMock.setTopMenuContent).toHaveBeenLastCalledWith({
      component: ViewHeader,
      props: { title: 'Tavern' },
    });
    expect(wrapper.text()).not.toContain('Forest');
    wrapper.unmount();
    expect(layoutMock.setTopMenuContent).toHaveBeenLastCalledWith(null);
  });

  it('navigates back to the ambient main page', async () => {
    const wrapper = mount(AmbientSceneView, { global: { stubs } });
    await flushPromises();

    wrapper.findComponent({ name: 'ScenePlayerView' }).vm.$emit('back');
    await flushPromises();
    expect(routerMock.push).toHaveBeenCalledWith({
      name: 'ambient-sound',
    });
    wrapper.unmount();
  });

  it('redirects to the ambient main page when the scene is missing', async () => {
    routeMock.params = { sceneId: 'missing' };
    const wrapper = mount(AmbientSceneView, { global: { stubs } });
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
    storeMock.allScenes = reactive([
      {
        pack: { id: 'pack-1', name: 'Forest' },
        scene: { id: 'scene-1', name: 'Tavern' },
      },
    ]) as any;
    const wrapper = mount(AmbientSceneView, { global: { stubs } });
    await flushPromises();
    expect(routerMock.replace).not.toHaveBeenCalled();

    storeMock.allScenes.splice(0);
    await flushPromises();
    expect(routerMock.replace).toHaveBeenCalledWith({
      name: 'ambient-sound',
    });
    wrapper.unmount();
  });

  it('shows the loading state while packs load', () => {
    storeMock.loading = true;
    const wrapper = mount(AmbientSceneView, { global: { stubs } });
    expect(wrapper.text()).toContain('Loading sound pack...');
    wrapper.unmount();
  });
});
