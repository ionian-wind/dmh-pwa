import { computed, ref } from 'vue';

type SelectionKind = 'track' | 'playlist';

const selectedTrackIds = ref<Set<string>>(new Set());
const selectedPlaylistIds = ref<Set<string>>(new Set());
const trackOrder = ref<string[]>([]);
const playlistOrder = ref<string[]>([]);
const lastSelected = ref<{ kind: SelectionKind; id: string } | null>(null);

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

  function setTrackOrder(ids: string[]) {
    trackOrder.value = [...ids];
  }

  function setPlaylistOrder(ids: string[]) {
    playlistOrder.value = [...ids];
  }

  function selectRange(kind: SelectionKind, id: string, selected: boolean) {
    const anchor = lastSelected.value;
    if (!anchor || anchor.kind !== kind) return false;

    const order = kind === 'track' ? trackOrder.value : playlistOrder.value;
    const fromIndex = order.indexOf(anchor.id);
    const toIndex = order.indexOf(id);
    if (fromIndex < 0 || toIndex < 0) return false;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const target = kind === 'track' ? selectedTrackIds : selectedPlaylistIds;
    const next = new Set(target.value);

    for (const rangeId of order.slice(start, end + 1)) {
      if (selected) next.add(rangeId);
      else next.delete(rangeId);
    }

    target.value = next;
    return true;
  }

  function toggleTrack(trackId: string, selected: boolean, shift = false) {
    if (selected && hasSelectedPlaylists.value) return;
    if (shift && selectRange('track', trackId, selected)) return;

    updateSet(selectedTrackIds, trackId, selected);
    lastSelected.value = { kind: 'track', id: trackId };
  }

  function togglePlaylist(
    playlistId: string,
    selected: boolean,
    shift = false,
  ) {
    if (selected && hasSelectedTracks.value) return;
    if (shift && selectRange('playlist', playlistId, selected)) return;

    updateSet(selectedPlaylistIds, playlistId, selected);
    lastSelected.value = { kind: 'playlist', id: playlistId };
  }

  function clearSelection() {
    selectedTrackIds.value = new Set();
    selectedPlaylistIds.value = new Set();
    lastSelected.value = null;
  }

  return {
    selectedTrackIds,
    selectedPlaylistIds,
    hasSelectedTracks,
    hasSelectedPlaylists,
    hasSelection,
    trackOrder,
    playlistOrder,
    setTrackOrder,
    setPlaylistOrder,
    toggleTrack,
    togglePlaylist,
    clearSelection,
  };
}
