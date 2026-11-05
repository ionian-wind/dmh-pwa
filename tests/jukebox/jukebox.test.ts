import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { defineComponent, h, nextTick } from 'vue';

import JukeboxView from '@/jukebox/JukeboxView.vue';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import TrackCard from '@/jukebox/components/TrackCard.vue';
import {
  useJukeboxPlaylistsStore,
  useJukeboxTracksStore,
} from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useConfigStore } from '@/utils/configStore';
import { createLayoutStore, LayoutKey } from '@/composables/useLayout';
import { useJukeboxBulkSelection } from '@/jukebox/composables/useJukeboxBulkSelection';

const provides = {};

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: {
    kind: String,
    modelValue: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { class: 'entities-linking-stub' });
  },
});

async function seedTrack(title = 'Tavern Theme') {
  const tracks = useJukeboxTracksStore();
  const track = await tracks.create({
    fileId: `file-${title}`,
    title,
    playlistIds: [],
  });
  return track;
}

function dispatchPointerDown(element: Element, shiftKey: boolean) {
  element.dispatchEvent(
    new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      shiftKey,
    }),
  );
}

describe('jukebox store integration', () => {
  beforeEach(() => {
    useJukeboxBulkSelection().clearSelection();
  });

  it('builds the queue from jukebox store arrays', async () => {
    const tracks = useJukeboxTracksStore();
    await seedTrack('One');
    await seedTrack('Two');

    const player = useJukeboxPlayerStore();
    player.actualiseQueue();

    expect(player.queue.map((track) => track.title)).toEqual(['One', 'Two']);
  });

  it('refreshes the queue when the active playlist tracks change', async () => {
    const tracks = useJukeboxTracksStore();
    const first = await seedTrack('One');
    const second = await seedTrack('Two');
    const playlists = useJukeboxPlaylistsStore();
    const playlist = await playlists.create({
      name: 'Set',
      trackIds: [first.id],
    });
    const config = useConfigStore();
    config.jukeboxActivePlaylistId = playlist.id;

    const player = useJukeboxPlayerStore();
    await player.init();
    await nextTick();
    expect(player.queue.map((track) => track.title)).toEqual(['One']);

    await playlists.update(playlist.id, {
      trackIds: [first.id, second.id],
    });
    await nextTick();

    expect(player.queue.map((track) => track.title)).toEqual(['One', 'Two']);
  });

  it('adds and removes a track through playlist entity linking', async () => {
    const track = await seedTrack('Tavern Theme');
    const playlists = useJukeboxPlaylistsStore();
    const playlist = await playlists.create({
      name: 'Set',
      trackIds: [],
    });

    const wrapper = mount(AddToPlaylistModal, {
      props: { modelValue: true, track },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });
    const linking = wrapper.findComponent(EntitiesLinkingStub);
    expect(linking.props()).toMatchObject({
      kind: 'playlist',
      modelValue: [],
    });

    linking.vm.$emit('update:modelValue', [
      { kind: 'playlist', id: playlist.id },
    ]);
    await flushPromises();
    await vi.waitFor(() =>
      expect(playlists.getById(playlist.id)?.trackIds).toEqual([track.id]),
    );

    wrapper
      .findComponent(EntitiesLinkingStub)
      .vm.$emit('update:modelValue', []);
    await flushPromises();
    await vi.waitFor(() =>
      expect(playlists.getById(playlist.id)?.trackIds).toEqual([]),
    );

    wrapper.unmount();
  });

  it('does nothing when linking playlists without a track', async () => {
    const playlists = useJukeboxPlaylistsStore();
    const playlist = await playlists.create({
      name: 'Set',
      trackIds: [],
    });
    const wrapper = mount(AddToPlaylistModal, {
      props: { modelValue: true, track: null },
      global: { stubs: { EntitiesLinking: EntitiesLinkingStub } },
    });

    wrapper
      .findComponent(EntitiesLinkingStub)
      .vm.$emit('update:modelValue', [{ kind: 'playlist', id: playlist.id }]);
    await flushPromises();
    expect(playlists.getById(playlist.id)?.trackIds).toEqual([]);
    wrapper.unmount();
  });

  it('moves tracks into the next and last queue positions', async () => {
    const first = await seedTrack('One');
    const second = await seedTrack('Two');
    const third = await seedTrack('Three');
    const fourth = await seedTrack('Four');

    const player = useJukeboxPlayerStore();
    player.queue = [first, second, third];
    player.queueIndex = 0;

    player.queueTrackNext(third);
    expect(player.queue.map((track) => track.title)).toEqual([
      'One',
      'Three',
      'Two',
    ]);

    player.queueTrackLast(fourth);
    expect(player.queue.map((track) => track.title)).toEqual([
      'One',
      'Three',
      'Two',
      'Four',
    ]);

    player.queueTrackNext(fourth);
    expect(player.queue.map((track) => track.title)).toEqual([
      'One',
      'Four',
      'Three',
      'Two',
    ]);
    expect(player.queueIndex).toBe(0);

    player.queueTrackNext(first);
    expect(player.queue.map((track) => track.title)).toEqual([
      'One',
      'Four',
      'Three',
      'Two',
    ]);

    player.queueIndex = 2; // Three
    player.queueTrackLast(first);
    expect(player.queue.map((track) => track.title)).toEqual([
      'Four',
      'Three',
      'Two',
      'One',
    ]);
    expect(player.queueIndex).toBe(1);
    expect(player.queue.at(player.queueIndex)?.title).toBe('Three');
  });

  it('TrackCard exposes queue actions in an icon-only menu', async () => {
    const track = await seedTrack('Tavern Theme');
    const wrapper = mount(TrackCard, { props: { track } });

    const trigger = wrapper.find('.track-menu-trigger');
    expect(trigger.exists()).toBe(true);
    expect(trigger.attributes('title')).toBe('Actions');

    const items = wrapper.findAll('.track-actions-menu [data-stub="QItem"]');
    expect(items).toHaveLength(4);

    await items[0].trigger('click');
    await items[1].trigger('click');
    await items[2].trigger('click');
    await items[3].trigger('click');

    expect(wrapper.emitted('add-to-playlist')?.[0]).toEqual([track]);
    expect(wrapper.emitted('play-next')?.[0]).toEqual([track]);
    expect(wrapper.emitted('play-last')?.[0]).toEqual([track]);
    expect(wrapper.emitted('remove')?.[0]).toEqual([track]);
  });

  it('marks draggable tracks and emits play on click', async () => {
    const track = await seedTrack('Tavern Theme');
    const wrapper = mount(TrackCard, {
      props: {
        track: { ...track, duration: undefined },
        draggable: true,
        selectable: true,
      },
    });

    const item = wrapper.find('.track-item');
    expect(item.attributes('data-draggable')).toBe('true');
    const handle = wrapper.find('.track-drag-handle');
    expect(handle.exists()).toBe(true);
    const bulk = wrapper.find('.track-bulk-select input[type="checkbox"]');
    expect(bulk.exists()).toBe(true);
    await bulk.setValue(true);
    expect((bulk.element as HTMLInputElement).checked).toBe(true);
    await handle.trigger('click');
    expect(wrapper.emitted('play')).toBeUndefined();
    await item.trigger('click');
    expect(wrapper.emitted('play')?.[0]).toEqual([
      { ...track, duration: undefined },
    ]);
    wrapper.unmount();

    const staticCard = mount(TrackCard, {
      props: { track: { ...track, duration: 42 } },
    });
    expect(staticCard.find('.track-item').attributes('data-draggable')).toBe(
      undefined,
    );
    expect(staticCard.find('.track-drag-handle').exists()).toBe(false);
    expect(staticCard.find('.track-bulk-select').exists()).toBe(false);
    expect(staticCard.text()).toContain('0:42');
    staticCard.unmount();
  });

  it('shows bulk selection without drag handles when selectable', async () => {
    const track = await seedTrack('All Tracks Song');
    const wrapper = mount(TrackCard, {
      props: { track, selectable: true },
    });

    expect(wrapper.find('.track-drag-handle').exists()).toBe(false);
    expect(
      wrapper.find('.track-bulk-select input[type="checkbox"]').exists(),
    ).toBe(true);
    wrapper.unmount();
  });

  it('shows the generated waveform behind a playing track', async () => {
    const track = {
      id: 'waveform-track',
      fileId: 'f1',
      title: 'Wave',
      waveform:
        '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 1L0 9" stroke="#666"/></svg>',
    };
    const wrapper = mount(TrackCard, {
      props: { track, isPlaying: true },
    });

    const waveform = wrapper.find('.track-waveform');
    expect(waveform.exists()).toBe(true);
    expect(waveform.html()).toContain('<svg');
    expect(waveform.html()).toContain('M0 1L0 9');

    await wrapper.setProps({ isPlaying: false });
    expect(wrapper.find('.track-waveform').exists()).toBe(false);
    wrapper.unmount();
  });

  it('publishes the playlist drawer and player footer', async () => {
    const layout = createLayoutStore();
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/jukebox', component: { render: () => h('div') } }],
    });
    await router.push('/jukebox');
    await router.isReady();

    const wrapper = mount(JukeboxView, {
      global: {
        plugins: [router],
        provide: { [LayoutKey]: layout },
      },
    });
    await flushPromises();
    await vi.waitFor(
      () => {
        expect(layout.rightDrawerContent.value).not.toBeNull();
      },
      { timeout: 2000 },
    );

    expect(layout.bottomDrawerContent.value).not.toBeNull();
    wrapper.unmount();
  });

  it('renders the active playlist tracks in JukeboxView', async () => {
    const track = await seedTrack('Tavern Theme');
    const playlists = useJukeboxPlaylistsStore();
    const playlist = await playlists.create({
      name: 'Tavern',
      trackIds: [track.id],
    });
    const config = useConfigStore();
    config.jukeboxActivePlaylistId = playlist.id;

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/jukebox', component: { render: () => h('div') } }],
    });
    await router.push('/jukebox');
    await router.isReady();

    const wrapper = mount(JukeboxView, {
      global: { plugins: [router], provide: provides },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Tavern Theme');
    wrapper.unmount();
  });

  it('hides remove from the track menu outside edit mode', async () => {
    const track = await seedTrack('Tavern Theme');
    const wrapper = mount(TrackCard, {
      props: { track, showRemove: false },
    });

    const items = wrapper.findAll('.track-actions-menu [data-stub="QItem"]');
    expect(items).toHaveLength(3);
    expect(wrapper.text()).not.toContain('Remove');
    wrapper.unmount();
  });

  it('renders disabled tracks with a muted style', async () => {
    const track = await seedTrack('Gone');
    const wrapper = mount(TrackCard, {
      props: { track: { ...track, disabled: true } },
    });

    expect(wrapper.find('.track-item').classes()).toContain('is-disabled');
    wrapper.unmount();
  });

  it('selects a range of tracks with shift-click', async () => {
    const bulk = useJukeboxBulkSelection();
    const first = { id: 't1', fileId: 'f1', title: 'One' };
    const second = { id: 't2', fileId: 'f2', title: 'Two' };
    const third = { id: 't3', fileId: 'f3', title: 'Three' };
    bulk.setTrackOrder(['t1', 't2', 't3']);

    const wrappers = [first, second, third].map((track) =>
      mount(TrackCard, { props: { track, selectable: true } }),
    );
    const checkboxes = wrappers.map((wrapper) =>
      wrapper.find('.track-bulk-select input[type="checkbox"]'),
    );

    dispatchPointerDown(checkboxes[0].element, false);
    await checkboxes[0].trigger('click');
    await checkboxes[0].trigger('change');
    dispatchPointerDown(checkboxes[2].element, true);
    await checkboxes[2].trigger('click');
    await checkboxes[2].trigger('change');

    expect([...bulk.selectedTrackIds.value]).toEqual(['t1', 't2', 't3']);
    for (const wrapper of wrappers) wrapper.unmount();
  });
});
