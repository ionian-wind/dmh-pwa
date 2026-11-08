import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { IconEar } from '@tabler/icons-vue';

const storeMock = vi.hoisted(() => ({
  allScenes: [] as any[],
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import ScenePlayerDialog from '@/ambient-sound/components/ScenePlayerDialog.vue';

const BaseModalStub = defineComponent({
  name: 'BaseModal',
  props: {
    isOpen: Boolean,
    tabs: { type: Array, default: () => [] },
    showExpand: Boolean,
  },
  emits: ['update:isOpen', 'cancel'],
  template: `<div v-if="isOpen" class="base-modal-stub">
    <slot name="main" />
    <slot name="links" />
  </div>`,
});

const ScenePlayerViewStub = defineComponent({
  name: 'ScenePlayerView',
  props: { packId: String, sceneId: String, showBack: Boolean },
  emits: ['back'],
  template: '<div class="scene-player-stub" />',
});

const SceneLinksPanelStub = defineComponent({
  name: 'SceneLinksPanel',
  props: { packId: String, sceneId: String },
  template: '<div class="scene-links-stub" />',
});

const stubs = {
  BaseModal: BaseModalStub,
  ScenePlayerView: ScenePlayerViewStub,
  SceneLinksPanel: SceneLinksPanelStub,
};

describe('ScenePlayerDialog', () => {
  beforeEach(() => {
    storeMock.allScenes = [
      {
        pack: { id: 'pack-1', name: 'Forest' },
        scene: { id: 'scene-1', name: 'Tavern Evening' },
      },
    ] as any;
  });

  it('renders the scene player and link tabs in an expandable dialog', () => {
    const wrapper = mount(ScenePlayerDialog, {
      props: { modelValue: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    const modal = wrapper.findComponent(BaseModalStub);
    expect(modal.props('isOpen')).toBe(true);
    expect(modal.props('showExpand')).toBe(true);
    const tabs = modal.props('tabs');
    expect(tabs.map((tab: { name: string }) => tab.name)).toEqual([
      'main',
      'links',
    ]);
    expect(tabs[0].icon).toBe(IconEar);

    const player = modal.findComponent(ScenePlayerViewStub);
    expect(player.props('packId')).toBe('pack-1');
    expect(player.props('sceneId')).toBe('scene-1');
    expect(player.props('showBack')).toBe(false);

    const links = modal.findComponent(SceneLinksPanelStub);
    expect(links.props('packId')).toBe('pack-1');
    expect(links.props('sceneId')).toBe('scene-1');
    wrapper.unmount();
  });

  it('closes when the player requests back or the modal is dismissed', async () => {
    const wrapper = mount(ScenePlayerDialog, {
      props: { modelValue: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    wrapper.findComponent(ScenePlayerViewStub).vm.$emit('back');
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);

    wrapper.findComponent(BaseModalStub).vm.$emit('update:isOpen', false);
    expect(wrapper.emitted('update:modelValue')).toHaveLength(2);
    wrapper.unmount();
  });

  it('closes when the scene no longer exists', async () => {
    storeMock.allScenes = [];
    const wrapper = mount(ScenePlayerDialog, {
      props: { modelValue: true, packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
    wrapper.unmount();
  });
});
