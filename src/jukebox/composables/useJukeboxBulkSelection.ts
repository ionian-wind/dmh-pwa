import { computed, ref } from 'vue';

const selectedTrackIds = ref<Set<string>>(new Set());
const selectedPlaylistIds = ref<Set<string>>(new Set());

function updateSet(
  target: typeof selectedTrackIds,
  id: string,
  selected: boolean,
) {
  const next = new Set(target.value);
  if (selected) next.add(id);
  else next.delete(id);
  target.value = next;
}

export function useJukeboxBulkSelection() {
  const hasSelectedTracks = computed(() => selectedTrackIds.value.size > 0);
  const hasSelectedPlaylists = computed(
    () => selectedPlaylistIds.value.size > 0,
  );
  const hasSelection = computed(
    () => hasSelectedTracks.value || hasSelectedPlaylists.value,
  );

  function toggleTrack(trackId: string, selected: boolean) {
    if (selected && hasSelectedPlaylists.value) return;
    updateSet(selectedTrackIds, trackId, selected);
  }

  function togglePlaylist(playlistId: string, selected: boolean) {
    if (selected && hasSelectedTracks.value) return;
    updateSet(selectedPlaylistIds, playlistId, selected);
  }

  function clearSelection() {
    selectedTrackIds.value = new Set();
    selectedPlaylistIds.value = new Set();
  }

  return {
    selectedTrackIds,
    selectedPlaylistIds,
    hasSelectedTracks,
    hasSelectedPlaylists,
    hasSelection,
    toggleTrack,
    togglePlaylist,
    clearSelection,
  };
}
