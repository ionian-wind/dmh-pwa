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
});
