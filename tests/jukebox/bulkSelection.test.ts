import { beforeEach, describe, expect, it } from 'vitest';
import { useJukeboxBulkSelection } from '@/jukebox/composables/useJukeboxBulkSelection';

describe('useJukeboxBulkSelection', () => {
  beforeEach(() => {
    useJukeboxBulkSelection().clearSelection();
  });

  it('selects and clears tracks', () => {
    const bulk = useJukeboxBulkSelection();

    bulk.toggleTrack('t1', true);
    bulk.toggleTrack('t2', true);
    expect(bulk.hasSelectedTracks.value).toBe(true);
    expect(bulk.hasSelection.value).toBe(true);
    expect([...bulk.selectedTrackIds.value]).toEqual(['t1', 't2']);

    bulk.toggleTrack('t1', false);
    expect([...bulk.selectedTrackIds.value]).toEqual(['t2']);

    bulk.clearSelection();
    expect(bulk.hasSelection.value).toBe(false);
  });

  it('does not mix track and playlist selections', () => {
    const bulk = useJukeboxBulkSelection();

    bulk.toggleTrack('t1', true);
    bulk.togglePlaylist('p1', true);
    expect(bulk.selectedPlaylistIds.value.size).toBe(0);
    expect(bulk.hasSelectedTracks.value).toBe(true);

    bulk.toggleTrack('t1', false);
    bulk.togglePlaylist('p1', true);
    bulk.toggleTrack('t1', true);
    expect(bulk.selectedTrackIds.value.size).toBe(0);
    expect(bulk.hasSelectedPlaylists.value).toBe(true);

    bulk.togglePlaylist('p1', false);
    expect(bulk.hasSelection.value).toBe(false);
  });

  it('selects a range between the last selection and a shift-click', () => {
    const bulk = useJukeboxBulkSelection();
    bulk.setTrackOrder(['t1', 't2', 't3', 't4']);

    bulk.toggleTrack('t1', true);
    bulk.toggleTrack('t3', true, true);
    expect([...bulk.selectedTrackIds.value]).toEqual(['t1', 't2', 't3']);

    bulk.clearSelection();
    bulk.toggleTrack('t4', true);
    bulk.toggleTrack('t2', true, true);
    expect([...bulk.selectedTrackIds.value].sort()).toEqual(['t2', 't3', 't4']);

    bulk.clearSelection();
    bulk.setPlaylistOrder(['p1', 'p2', 'p3']);
    bulk.togglePlaylist('p3', true);
    bulk.togglePlaylist('p1', true, true);
    expect([...bulk.selectedPlaylistIds.value].sort()).toEqual([
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('deselects a range with shift-click and falls back without an anchor', () => {
    const bulk = useJukeboxBulkSelection();
    bulk.setTrackOrder(['t1', 't2', 't3']);

    bulk.toggleTrack('t1', true);
    bulk.toggleTrack('t3', true, true);
    bulk.toggleTrack('t3', false, true);
    expect(bulk.selectedTrackIds.value.size).toBe(0);

    bulk.toggleTrack('t1', true);
    bulk.setTrackOrder(['t2']);
    bulk.toggleTrack('t2', true, true);
    expect([...bulk.selectedTrackIds.value]).toEqual(['t1', 't2']);
  });
});
