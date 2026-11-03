import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const storeMock = vi.hoisted(() => ({
  selectedPackId: 'imported-pack' as string | null,
  storedPacks: [] as any[],
  allScenes: [] as any[],
  activeSceneKey: null as string | null,
  isPlaying: false,
  activeScene: null as any,
  linksForScene: vi.fn(() => []),
  playScene: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  deleteScene: vi.fn(),
}));

const confirmMock = vi.hoisted(() => vi.fn());

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => storeMock,
}));
vi.mock('@/dialogs', () => ({ confirm: confirmMock }));

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
      storeMock.deleteScene,
      confirmMock,
    ]) {
      fn.mockReset();
    }
    storeMock.linksForScene.mockReturnValue([]);
    storeMock.selectedPackId = 'imported-pack';
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
    confirmMock.mockResolvedValue(true);
  });

  it('marks imported scenes and disables editing them', () => {
    const wrapper = mount(SceneList, {
      global: { stubs: quasarStubs },
    });

    const rows = wrapper.findAll('.scene-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].find('.imported-mark').exists()).toBe(true);

    const edit = rows[0].find('button[aria-label="Edit"]');
    expect(edit.attributes('disabled')).toBeDefined();

    const newScene = wrapper
      .findAll('button')
      .find((button) => button.text() === 'New scene');
    expect(newScene?.attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('filters scenes and shows the empty state', async () => {
    storeMock.selectedPackId = null;
    const wrapper = mount(SceneList, {
      global: { stubs: quasarStubs },
    });
    expect(wrapper.findAll('.scene-row')).toHaveLength(2);

    await wrapper.find('input').setValue('Smithy');
    expect(wrapper.findAll('.scene-row')).toHaveLength(1);

    await wrapper.find('input').setValue('missing');
    expect(wrapper.findAll('.scene-row')).toHaveLength(0);
    expect(wrapper.text()).toContain('No scenes yet');
    wrapper.unmount();
  });

  it('lets created scenes be edited and started', async () => {
    storeMock.selectedPackId = 'local-pack';
    const wrapper = mount(SceneList, {
      global: { stubs: quasarStubs },
    });

    const row = wrapper.find('.scene-row');
    expect(row.find('.imported-mark').exists()).toBe(false);
    const edit = row.find('button[aria-label="Edit"]');
    expect(edit.attributes('disabled')).toBeUndefined();
    await edit.trigger('click');
    expect(wrapper.emitted('edit')?.[0]).toEqual(['local-pack', 'scene-2']);

    const play = row.find('button[aria-label="Play"]');
    await play.trigger('click');
    expect(storeMock.playScene).toHaveBeenCalledWith('local-pack', 'scene-2');

    const newScene = wrapper
      .findAll('button')
      .find((button) => button.text() === 'New scene');
    await newScene!.trigger('click');
    expect(wrapper.emitted('create')?.[0]).toEqual(['local-pack']);
    wrapper.unmount();
  });

  it('pauses the active scene and deletes scenes after confirmation', async () => {
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

    await row.find('button[aria-label="Delete"]').trigger('click');
    await vi.waitFor(() =>
      expect(storeMock.deleteScene).toHaveBeenCalledWith(
        'local-pack',
        'scene-2',
      ),
    );
    wrapper.unmount();
  });
});
