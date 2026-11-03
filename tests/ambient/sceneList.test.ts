import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  selectedPackId: null as string | null,
  storedPacks: [] as any[],
  allScenes: [] as any[],
  activeSceneKey: null as string | null,
  isPlaying: false,
  activeScene: null as any,
  linksForScene: vi.fn(() => []),
  playScene: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));

import SceneList from '@/ambient-sound/components/SceneList.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const importedPack = {
  id: 'imported-pack',
  name: 'Imported Pack',
  origin: 'imported',
};
const createdPack = { id: 'local-pack', name: 'Local Pack', origin: 'created' };
const scene = {
  id: 'scene-1',
  name: 'Tavern',
  description: 'A warm inn',
  icon: '🍺',
};

describe('SceneList', () => {
  beforeEach(() => {
    for (const fn of [
      storeMock.linksForScene,
      storeMock.playScene,
      storeMock.play,
      storeMock.pause,
    ]) {
      fn.mockReset();
    }
    storeMock.linksForScene.mockReturnValue([]);
    storeMock.selectedPackId = null;
    storeMock.storedPacks = [importedPack, createdPack];
    storeMock.allScenes = [
      { pack: importedPack, scene },
      {
        pack: createdPack,
        scene: { ...scene, id: 'scene-2', name: 'Smithy' },
      },
    ];
    storeMock.activeSceneKey = null;
    storeMock.isPlaying = false;
    storeMock.activeScene = null;
  });

  it('opens a scene from its row', async () => {
    const wrapper = mount(SceneList, {
      global: { stubs: quasarStubs },
    });
    expect(wrapper.findAll('.scene-row')).toHaveLength(2);

    const row = wrapper.find('.scene-row');
    await row.trigger('click');
    expect(wrapper.emitted('open')?.[0]).toEqual(['imported-pack', 'scene-1']);
    wrapper.unmount();
  });

  it('filters scenes by the selected package', () => {
    storeMock.selectedPackId = 'local-pack';
    const wrapper = mount(SceneList, {
      global: { stubs: quasarStubs },
    });

    expect(wrapper.findAll('.scene-row')).toHaveLength(1);
    expect(wrapper.text()).toContain('Smithy');
    expect(wrapper.text()).not.toContain('Tavern');
    wrapper.unmount();
  });

  it('shows the empty scene state', () => {
    storeMock.allScenes = [];
    const wrapper = mount(SceneList, {
      global: { stubs: quasarStubs },
    });

    expect(wrapper.findAll('.scene-row')).toHaveLength(0);
    expect(wrapper.text()).toContain('No scenes yet');
    wrapper.unmount();
  });

  it('shows only playback controls and does not expose edit or delete actions', () => {
    storeMock.selectedPackId = 'local-pack';
    const wrapper = mount(SceneList, {
      global: { stubs: quasarStubs },
    });

    const row = wrapper.find('.scene-row');
    expect(row.find('.imported-mark').exists()).toBe(false);
    expect(row.find('button[aria-label="Edit"]').exists()).toBe(false);
    expect(row.find('button[aria-label="Delete"]').exists()).toBe(false);
    expect(row.find('button[aria-label="Play"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('New scene');
    wrapper.unmount();
  });

  it('pauses the active scene', async () => {
    storeMock.selectedPackId = 'local-pack';
    storeMock.activeSceneKey = 'local-pack::scene-2';
    storeMock.isPlaying = true;
    storeMock.activeScene = { pack: createdPack, scene: { id: 'scene-2' } };
    const wrapper = mount(SceneList, {
      global: { stubs: quasarStubs },
    });

    const row = wrapper.find('.scene-row');
    await row.find('button[aria-label="Pause"]').trigger('click');
    expect(storeMock.pause).toHaveBeenCalled();
    wrapper.unmount();
  });
});
