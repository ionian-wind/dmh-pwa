import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { h, nextTick } from 'vue';

import JukeboxView from '@/jukebox/JukeboxView.vue';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import TrackCard from '@/jukebox/components/TrackCard.vue';
import { useJukeboxPlaylistsStore, useJukeboxTracksStore } from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useConfigStore } from '@/utils/configStore';
import { createLayoutStore, LayoutKey } from '@/composables/useLayout';

const provides = {};

async function seedTrack(title = 'Tavern Theme') {
  const tracks = useJukeboxTracksStore();
  const track = await tracks.create({
    fileId: `file-${title}`,
    title,
    playlistIds: [],
  });
  return track;
}

describe('jukebox store integration', () => {
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

  it('creates a playlist from the add-to-playlist dialog and adds the track', async () => {
    const track = await seedTrack('Tavern Theme');
    const playlists = useJukeboxPlaylistsStore();

    const wrapper = mount(AddToPlaylistModal, {
      props: { modelValue: true, track },
    });

    const input = wrapper.find('#new-playlist-name');
    expect(input.exists()).toBe(true);
    await input.setValue('Road trip');

    const createButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create');
    expect(createButton).toBeTruthy();
    await createButton!.trigger('click');
    await flushPromises();

    expect(playlists.items.value).toHaveLength(1);
    expect(playlists.items.value[0]).toMatchObject({
      name: 'Road trip',
      trackIds: [track.id],
    });

    await nextTick();
    const toggles = wrapper.findAll('input[type="checkbox"]');
    expect(toggles).toHaveLength(1);
    expect((toggles[0].element as HTMLInputElement).checked).toBe(true);

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

    const items = wrapper.findAll(
      '.track-actions-menu [data-stub="QItem"]',
    );
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
});
