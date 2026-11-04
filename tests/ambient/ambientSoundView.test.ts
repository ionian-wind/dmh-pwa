import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

const storeMock = vi.hoisted(() => ({
  loading: false,
  storedPacks: [{ id: 'pack-1', name: 'Campaign' }],
  allScenes: [] as any[],
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
  useLayout: () => ({
    setTopMenuContent: layoutMock.setTopMenuContent,
  }),
  useRightDrawer: () => rightDrawerMock,
}));

import AmbientSoundView from '@/ambient-sound/AmbientSoundView.vue';
import ViewHeader from '@/components/common/ViewHeader.vue';
import { IconEar } from '@tabler/icons-vue';
import SoundPackSidebar from '@/ambient-sound/components/SoundPackSidebar.vue';
import { EntityTabsStub } from '../helpers/entityTabsStub';

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    isOpen: Boolean,
    title: String,
    tabs: { type: Array, default: () => [] },
    showExpand: Boolean,
  },
  emits: ['update:isOpen', 'cancel'],
  template: `<div v-if="isOpen" class="base-modal-stub">
    <span class="modal-title">{{ title }}</span>
    <slot name="main" />
    <slot name="links" />
  </div>`,
});

const SceneLinksPanelStub = defineComponent({
  name: 'SceneLinksPanel',
  props: { packId: String, sceneId: String },
  template: '<div class="scene-links-stub" />',
});

const stubs = {
  QSpinnerDots: true,
  SceneList: true,
  AmbienceGallery: true,
  OneShotGallery: true,
  ScenePlayerView: true,
  SceneLinksPanel: SceneLinksPanelStub,
  BaseModal: BaseModalStub,
  EntityTabs: EntityTabsStub,
};

describe('AmbientSoundView', () => {
  beforeEach(() => {
    storeMock.loading = false;
    storeMock.storedPacks = [{ id: 'pack-1', name: 'Campaign' }] as any;
    storeMock.allScenes = [
      {
        pack: { id: 'pack-1', name: 'Forest' },
        scene: { id: 'scene-1', name: 'Tavern Evening' },
      },
    ] as any;
    for (const fn of [
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

  it('opens the scene player in a dialog', async () => {
    const wrapper = mount(AmbientSoundView, { global: { stubs } });
    await flushPromises();

    wrapper
      .findComponent({ name: 'SceneList' })
      .vm.$emit('open', 'pack-1', 'scene-1');
    await flushPromises();

    const modal = wrapper.findComponent(BaseModalStub);
    expect(modal.props('isOpen')).toBe(true);
    expect(modal.props('showExpand')).toBe(true);
    const tabs = modal.props('tabs');
    expect(tabs.map((tab: { name: string }) => tab.name)).toEqual([
      'main',
      'links',
    ]);
    expect(tabs[0].icon).toBe(IconEar);
    const player = modal.findComponent({ name: 'ScenePlayerView' });
    expect(player.exists()).toBe(true);
    expect(player.props('packId')).toBe('pack-1');
    expect(player.props('sceneId')).toBe('scene-1');
    expect(player.props('showBack')).toBe(false);
    const links = modal.findComponent(SceneLinksPanelStub);
    expect(links.props('packId')).toBe('pack-1');
    expect(links.props('sceneId')).toBe('scene-1');

    player.vm.$emit('back');
    await flushPromises();
    expect(modal.props('isOpen')).toBe(false);
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
