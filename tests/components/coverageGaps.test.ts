import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import TimerListItem from '@/timers/TimerListItem.vue';
import PawnEditor from '@/pawns/PawnEditor.vue';
import PlaylistEditor from '@/jukebox/components/PlaylistEditor.vue';
import EntityScenesPanel from '@/ambient-sound/components/EntityScenesPanel.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { quasarStubs } from '../helpers/quasar-stubs';

const mocks = vi.hoisted(() => ({
  timerStore: { now: 0 },
  playlists: {
    items: { value: [] as any[] },
    create: vi.fn(),
    update: vi.fn(),
  },
  ambient: {
    storedPacks: [] as any[],
    allScenes: [] as any[],
    activeSceneKey: null as string | null,
    isPlaying: false,
    loadStoredPacks: vi.fn(),
    linksForEntity: vi.fn(),
    linksForScene: vi.fn(),
    addSceneLink: vi.fn(),
    removeSceneLink: vi.fn(),
    playScene: vi.fn(),
    pause: vi.fn(),
  },
}));

vi.mock('@/stores/timers', () => ({
  useTimerStore: () => mocks.timerStore,
}));

vi.mock('@/jukebox/stores', () => ({
  useJukeboxPlaylistsStore: () => mocks.playlists,
}));

vi.mock('@/ambient-sound/stores/ambientSoundStore', () => ({
  useAmbientSoundStore: () => mocks.ambient,
}));

const EntitiesLinkingStub = {
  name: 'EntitiesLinking',
  props: ['kind', 'modelValue'],
  template: '<div class="entities-linking-stub" />',
};

const EntityMarkdownEditorStub = defineComponent({
  name: 'EntityMarkdownEditor',
  props: ['modelValue', 'isVisualMode', 'entityId', 'entityType'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => 'Sneaky' });
    return () => h('div', { class: 'entity-markdown-editor-stub' });
  },
});

const baseTimer = {
  id: 't1',
  title: 'Inactive',
  duration: 60000,
  startedAt: null,
  status: 'inactive',
  createdAt: 1,
  updatedAt: 1,
};

describe('coverage gaps: small components', () => {
  beforeEach(() => {
    mocks.timerStore.now = 0;
    mocks.playlists.items.value = [];
    mocks.ambient.storedPacks = [];
    mocks.ambient.allScenes = [];
    mocks.ambient.activeSceneKey = null;
    mocks.ambient.isPlaying = false;
    mocks.ambient.linksForEntity.mockReturnValue([]);
    mocks.ambient.linksForScene.mockReturnValue([]);
  });

  it('renders timer states and emits timer actions', async () => {
    const inactive = mount(TimerListItem, {
      props: { timer: baseTimer as any },
    });
    expect(inactive.text()).toContain('Inactive');
    expect(inactive.text()).toContain('Duration');
    await inactive.find('button[title="Start"]').trigger('click');
    expect(inactive.emitted('start')).toHaveLength(1);
    await inactive.find('button[title="Edit Timer"]').trigger('click');
    await inactive.find('button[title="Delete Timer"]').trigger('click');
    expect(inactive.emitted('edit')).toHaveLength(1);
    expect(inactive.emitted('delete')).toHaveLength(1);

    mocks.timerStore.now = 120000;
    const running = mount(TimerListItem, {
      props: {
        timer: {
          ...baseTimer,
          status: 'running',
          startedAt: 60000,
          title: '',
        } as any,
      },
    });
    expect(running.text()).toContain('Remaining');
    expect(running.text()).toContain('(no title)');
    await running.find('button[title="Stop"]').trigger('click');
    expect(running.emitted('stop')).toHaveLength(1);

    const finished = mount(TimerListItem, {
      props: { timer: { ...baseTimer, status: 'finished' } as any },
    });
    expect(finished.text()).toContain('Finished');
    await finished.find('button[title="Reset"]').trigger('click');
    expect(finished.emitted('reset')).toHaveLength(1);

    inactive.unmount();
    running.unmount();
    finished.unmount();
  });

  it('submits and deletes a pawn', async () => {
    const wrapper = mount(PawnEditor, {
      props: { isOpen: true, pawn: null },
      global: {
        stubs: {
          EntitiesLinking: EntitiesLinkingStub,
          EntityMarkdownEditor: EntityMarkdownEditorStub,
        },
      },
    });
    const inputs = wrapper.findAllComponents(quasarStubs.QInput);
    inputs[0].vm.$emit('update:modelValue', 'Goblin');
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'Goblin',
      notes: 'Sneaky',
    });

    const pawn = {
      id: 'm1',
      name: 'Goblin',
      notes: '',
      moduleIds: ['mod1'],
      createdAt: 1,
      updatedAt: 1,
    };
    const existing = mount(PawnEditor, {
      props: { isOpen: true, pawn: pawn as any },
      global: {
        stubs: {
          EntitiesLinking: EntitiesLinkingStub,
          EntityMarkdownEditor: EntityMarkdownEditorStub,
        },
      },
    });
    expect(existing.findComponent(BaseModal).props('showDelete')).toBe(true);
    existing.findComponent(BaseModal).vm.$emit('delete');
    expect(existing.emitted('delete')?.[0]).toEqual(['m1']);
    wrapper.unmount();
    existing.unmount();
  });

  it('creates and updates playlists', async () => {
    mocks.playlists.items.value = [{ id: 'p0', sortOrder: 4 }];
    mocks.playlists.create.mockResolvedValue({ id: 'p1', name: 'Mix' });
    mocks.playlists.update.mockResolvedValue({ id: 'p1', name: 'Updated' });

    const wrapper = mount(PlaylistEditor, {
      props: { modelValue: true, playlist: null },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    const inputs = wrapper.findAllComponents(quasarStubs.QInput);
    inputs[0].vm.$emit('update:modelValue', 'Mix');
    inputs[1].vm.$emit('update:modelValue', 'A mix');
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(mocks.playlists.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mix', sortOrder: 5 }),
    );
    expect(wrapper.emitted('saved')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);

    const existing = mount(PlaylistEditor, {
      props: {
        modelValue: true,
        playlist: {
          id: 'p1',
          name: 'Old',
          trackIds: [],
          moduleIds: [],
          createdAt: 1,
          updatedAt: 1,
        } as any,
      },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    existing.findComponent(BaseModal).vm.$emit('submit');
    await nextTick();
    expect(mocks.playlists.update).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ name: 'Old' }),
    );
    existing.findComponent(BaseModal).vm.$emit('delete');
    expect(existing.emitted('delete')?.[0]).toEqual(['p1']);
    wrapper.unmount();
    existing.unmount();
  });

  it('links, plays and removes entity scenes', async () => {
    const pack = { id: 'pack1', name: 'Pack' };
    const scene = { id: 'scene1', name: 'Scene' };
    mocks.ambient.storedPacks = [pack];
    mocks.ambient.allScenes = [{ pack, scene }];
    mocks.ambient.playScene.mockResolvedValue(undefined);

    const wrapper = mount(EntityScenesPanel, {
      props: { entityType: 'location', entityId: 'l1' },
    });
    expect(wrapper.text()).toContain('No linked scenes');
    await wrapper.find('[title="Add scene"]').trigger('click');
    const available = wrapper
      .findAll('[data-stub="QItem"]')
      .find((item) => item.text().includes('Scene'))!;
    await available.trigger('click');
    expect(mocks.ambient.addSceneLink).toHaveBeenCalledWith(
      'pack1',
      'scene1',
      'location',
      'l1',
    );
    wrapper.unmount();

    mocks.ambient.linksForEntity.mockReturnValue([
      { id: 'link1', packageId: 'pack1', sceneId: 'scene1' },
    ]);
    mocks.ambient.linksForScene.mockReturnValue([
      {
        id: 'link1',
        packageId: 'pack1',
        sceneId: 'scene1',
        entityType: 'location',
        entityId: 'l1',
      },
    ]);
    mocks.ambient.activeSceneKey = 'pack1::scene1';
    mocks.ambient.isPlaying = true;
    const linked = mount(EntityScenesPanel, {
      props: { entityType: 'location', entityId: 'l1', editable: true },
    });
    expect(linked.find('.scene-link-item').classes()).toContain(
      'scene-link-item--selected',
    );
    expect(linked.find('.scene-link-item').classes()).toContain(
      'scene-link-item--playing',
    );
    await linked.find('.scene-link-item').trigger('click');
    expect(mocks.ambient.pause).toHaveBeenCalled();
    await linked.find('button[title="Remove link"]').trigger('click');
    expect(mocks.ambient.removeSceneLink).toHaveBeenCalledWith('link1');
    linked.unmount();

    const readonly = mount(EntityScenesPanel, {
      props: { entityType: 'location', entityId: 'l1' },
    });
    expect(readonly.find('button[title="Remove link"]').exists()).toBe(false);
    readonly.unmount();
  });
});
