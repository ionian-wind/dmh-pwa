import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

const storeMock = vi.hoisted(() => ({
  linksForScene: vi.fn(() => []),
  addSceneLink: vi.fn(),
  removeSceneLink: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import SceneLinksPanel from '@/ambient-sound/components/SceneLinksPanel.vue';

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: { kind: String, modelValue: { type: Array, default: () => [] } },
  emits: ['update:modelValue'],
  template: '<div class="entities-linking-stub" />',
});

const stubs = { EntitiesLinking: EntitiesLinkingStub };

describe('SceneLinksPanel', () => {
  beforeEach(() => {
    storeMock.linksForScene.mockReset();
    storeMock.linksForScene.mockReturnValue([
      {
        id: 'link-1',
        packageId: 'pack-1',
        sceneId: 'scene-1',
        entityType: 'location',
        entityId: 'location-1',
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    storeMock.addSceneLink.mockReset();
    storeMock.removeSceneLink.mockReset();
  });

  it('renders link selectors for supported entity types', () => {
    const wrapper = mount(SceneLinksPanel, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    const selectors = wrapper.findAllComponents(EntitiesLinkingStub);
    expect(selectors.map((selector) => selector.props('kind'))).toEqual([
      'location',
      'monster',
      'character',
      'encounter',
    ]);
    expect(selectors[0].props('modelValue')).toEqual([
      { kind: 'location', id: 'location-1' },
    ]);
    wrapper.unmount();
  });

  it('adds and removes scene links when the selection changes', async () => {
    const wrapper = mount(SceneLinksPanel, {
      props: { packId: 'pack-1', sceneId: 'scene-1' },
      global: { stubs },
    });

    wrapper
      .findAllComponents(EntitiesLinkingStub)[1]
      .vm.$emit('update:modelValue', [{ kind: 'monster', id: 'monster-1' }]);

    expect(storeMock.removeSceneLink).toHaveBeenCalledWith('link-1');
    expect(storeMock.addSceneLink).toHaveBeenCalledWith(
      'pack-1',
      'scene-1',
      'monster',
      'monster-1',
    );
    wrapper.unmount();
  });
});
