<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import draggable from 'vuedraggable';
import { pickAudioFiles, getFileFromHandle, extractTrackMetadata } from '@/jukebox/FileSystemUtils';
import { useJukeboxTracksStore, useJukeboxPlaylistsStore, useJukeboxFilesStore, deleteJukeboxFile, putJukeboxFile, getJukeboxFile, usePictureUrlCacheStore } from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import PlaylistEditor from '@/jukebox/components/PlaylistEditor.vue';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import TrackCard from '@/jukebox/components/TrackCard.vue';
import BaseListView from '@/components/common/BaseListView.vue';
import Button from '@/components/common/Button.vue';
import { useConfigStore } from '@/utils/configStore';
import type { JukeboxPlaylist, JukeboxTrack } from '@/jukebox/types';


const tracksStore = useJukeboxTracksStore();
const playlistsStore = useJukeboxPlaylistsStore();
const filesStore = useJukeboxFilesStore();
const configStore = useConfigStore();
const playerStore = useJukeboxPlayerStore();
const pictureUrlCacheStore = usePictureUrlCacheStore();

const tracks = tracksStore.items;
const playlists = playlistsStore.items;

const filteredPlaylists = computed(() => {
  let result = playlists.value || [];
  return result;
});

const sortedPlaylists = ref<JukeboxPlaylist[]>([]);
const selectedPlaylistId = ref<string | null>(configStore.activePlaylistId?.value ?? null);

const selectedPlaylistIdValue = computed(() => selectedPlaylistId.value);

watch(filteredPlaylists, (newPlaylists) => {
  updateSortedPlaylists(newPlaylists, selectedPlaylistId.value);
}, { immediate: true, deep: true });

watch(selectedPlaylistId, (currentPlaylistId) => {
  console.log('selectedPlaylistIdValue:', currentPlaylistId);
  updateSortedPlaylists(filteredPlaylists.value, currentPlaylistId);
}, { immediate: true });

function updateSortedPlaylists(newPlaylists: JukeboxPlaylist[], currentPlaylistId: string | null) {
  if (!newPlaylists || !Array.isArray(newPlaylists)) {
    sortedPlaylists.value = [];
    return;
  }
  let filteredPlaylists = [...newPlaylists].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (currentPlaylistId) {
    const currentPlaylist = playlists.value.find((p: JukeboxPlaylist) => p.id === currentPlaylistId);
    if (currentPlaylist && !filteredPlaylists.find((p: JukeboxPlaylist) => p.id === currentPlaylistId)) {
      filteredPlaylists.push(currentPlaylist);
      filteredPlaylists.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
  }
  sortedPlaylists.value = filteredPlaylists;
}

const isPlaylistModalOpen = ref(false);
const playlistToEdit = ref<JukeboxPlaylist | null>(null);
const isAddingTracks = ref(false);
const isAddToPlaylistModalOpen = ref(false);
const trackToAddToPlaylist = ref<JukeboxTrack | null>(null);

const { getPictureStyle } = pictureUrlCacheStore;

function openPlaylistModal(playlist: JukeboxPlaylist | null) {
  playlistToEdit.value = playlist;
  isPlaylistModalOpen.value = true;
}

function openAddToPlaylistModal(track: JukeboxTrack) {
  trackToAddToPlaylist.value = track;
  isAddToPlaylistModalOpen.value = true;
}

function setActivePlaylist(playlistId: string | null) {
  selectedPlaylistId.value = playlistId ?? null;
}

function playTrackFromPlaylist(track: JukeboxTrack) {
  if (configStore.activePlaylistId) {
    configStore.activePlaylistId.value = selectedPlaylistId.value;
  }
  playerStore.playTrack(track);
}

async function removePlaylist(playlistId: string) {
  if (selectedPlaylistId.value === playlistId) {
    selectedPlaylistId.value = null;
  }
  if (configStore.activePlaylistId && configStore.activePlaylistId.value === playlistId) {
    configStore.activePlaylistId.value = null;
  }
  await playlistsStore.remove(playlistId);
}

async function removeTrack(track: JukeboxTrack) {
  const isCurrentlyPlaying = playerStore.currentTrack?.id === track.id;
  const currentQueue = playerStore.queue;
  const newQueue = currentQueue.filter((t: JukeboxTrack) => t.id !== track.id);
  playerStore.setQueue(newQueue, playerStore.currentQueueId);
  if (isCurrentlyPlaying && newQueue.length > 0) {
    const nextTrackIndex = Math.min(currentQueue.findIndex(t => t.id === track.id), newQueue.length - 1);
    const nextTrack = newQueue[nextTrackIndex];
    if (nextTrack) {
      await playerStore.playTrack(nextTrack);
    }
  } else if (isCurrentlyPlaying) {
    playerStore.stop();
  }
  const playlistsToUpdate = playlistsStore.items.value.filter((p: JukeboxPlaylist) => p.trackIds.includes(track.id));
  const updatePromises = playlistsToUpdate.map(p => {
    const newTrackIds = p.trackIds.filter((tid: string) => tid !== track.id);
    return playlistsStore.update(p.id, { trackIds: newTrackIds });
  });
  await Promise.all(updatePromises);
  await tracksStore.remove(track.id);
  if (track.fileId) {
    try {
      await deleteJukeboxFile(track.fileId);
    } catch (e) {
      console.error(`Failed to delete file handle for track ${track.id}:`, e);
    }
  }
  const trackIndex = draggableTracks.value.findIndex(t => t.id === track.id);
  if (trackIndex > -1) {
    draggableTracks.value.splice(trackIndex, 1);
  }
}

const filteredTracks = computed(() => {
  if (!selectedPlaylistId.value) {
    return tracks.value;
  }
  const activePlaylist = playlistsStore.items.value.find((p: JukeboxPlaylist) => p.id === selectedPlaylistId.value);
  if (!activePlaylist) {
    return [];
  }
  return activePlaylist.trackIds.map((trackId: string) => tracks.value.find(t => t.id === trackId)).filter(Boolean) as JukeboxTrack[];
});

const draggableTracks = ref<JukeboxTrack[]>([]);
watch(filteredTracks, (newTracks) => {
  if ((configStore.activePlaylistId ? configStore.activePlaylistId.value : null) === selectedPlaylistId.value) {
    playerStore.setQueue(newTracks, (configStore.activePlaylistId ? configStore.activePlaylistId.value : null));
  }
  draggableTracks.value = [...newTracks];
}, { immediate: true, deep: true });

async function pickFiles() {
  if (isAddingTracks.value) return;
  isAddingTracks.value = true;
  try {
    const handles = await pickAudioFiles();
    const newTrackIds: string[] = [];
    for (const handle of handles) {
      const file = await getFileFromHandle(handle);
      const fileId = `${file.name}-${file.lastModified}-${file.size}`;
      const existingFile = await getJukeboxFile(fileId);
      await putJukeboxFile({
        id: fileId,
        handle: handle,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        createdAt: existingFile?.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
      const trackMeta = await extractTrackMetadata(file);
      const newTrackData = {
        fileId,
        title: trackMeta.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: trackMeta.artist,
        album: trackMeta.album,
        duration: trackMeta.duration,
        picture: trackMeta.picture,
        color: trackMeta.color,
        palette: trackMeta.palette,
        playlistIds: [],
        genre: trackMeta.genre,
        year: trackMeta.year,
        trackNumber: trackMeta.trackNumber,
        discNumber: trackMeta.discNumber,
        composer: trackMeta.composer,
        comment: trackMeta.comment,
        lyrics: trackMeta.lyrics,
      };
      const createdTrack = await tracksStore.create(newTrackData);
      newTrackIds.push(createdTrack.id);
    }
    if (selectedPlaylistId.value) {
      const playlist = playlistsStore.items.value.find((p: JukeboxPlaylist) => p.id === selectedPlaylistId.value);
      if (playlist) {
        const updatedTrackIds = [...playlist.trackIds, ...newTrackIds];
        await playlistsStore.update(playlist.id, { trackIds: updatedTrackIds });
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // User cancelled file picker, do nothing.
    } else {
      console.error("Error picking or processing files:", err);
    }
  } finally {
    isAddingTracks.value = false;
  }
}

function onPlaylistSortEnd(event: any) {
  const { newIndex, oldIndex } = event;
  if (newIndex === oldIndex) return;
  const newOrder = Array.from(sortedPlaylists.value);
  newOrder.forEach((playlist, index) => {
    playlistsStore.update(playlist.id, { ...playlist, sortOrder: index });
  });
}

const trackIsActive = (track: JukeboxTrack): boolean => 
  Boolean(playerStore.currentTrack && 
  playerStore.currentTrack.id === track.id && 
  (configStore.activePlaylistId ? configStore.activePlaylistId.value : null) === selectedPlaylistId.value);

const trackClick = (track: JukeboxTrack) => trackIsActive(track) ? playerStore.togglePlay() : playTrackFromPlaylist(track);

onMounted(async () => {
  await Promise.all([
    tracksStore.load(),
    playlistsStore.load(),
    filesStore.load(),
  ]);
  if (configStore.activePlaylistId && typeof configStore.activePlaylistId.value !== 'undefined') {
    selectedPlaylistId.value = configStore.activePlaylistId.value;
  }
  playerStore.setQueue(filteredTracks.value, selectedPlaylistId.value);
});

onBeforeUnmount(() => {
  pictureUrlCacheStore.clearCache();
});

function cardProps(track: JukeboxTrack) {
  return {
    track,
    isSelected: trackIsActive(track),
    isPlaying: playerStore.isPlaying && trackIsActive(track),
    onAddToPlaylist: () => openAddToPlaylistModal(track),
    onRemove: () => removeTrack(track),
    onPlay: () => trackClick(track),
  };
}

function onTracksSorted(newOrder: JukeboxTrack[]) {
  if (!selectedPlaylistId.value) return;
  const playlist = playlistsStore.items.value.find((p: JukeboxPlaylist) => p.id === selectedPlaylistId.value);
  if (!playlist) return;
  const newTrackIds = newOrder.map(t => t.id);
  playlistsStore.update(playlist.id, { ...playlist, trackIds: newTrackIds });
  if ((configStore.activePlaylistId ? configStore.activePlaylistId.value : null) === selectedPlaylistId.value) {
    playerStore.setQueue(draggableTracks.value, selectedPlaylistId.value);
  }
}
</script>

<template>
  <BaseListView
    :items="filteredTracks"
    :card-component="TrackCard"
    :empty-message="'No tracks to display. Add some tracks to get started!'"
    create-title="Add Tracks"
    :card-props="cardProps"
    :show-search="false"
    :view-style="'list'"
    @create="pickFiles"
    :draggable="selectedPlaylistIdValue !== null"
    @sort="onTracksSorted"
  >
    <template #sidepanel>
      <div class="playlist-sidebar">
        <div class="sidebar-header">
          <h3>Playlists</h3>
          <Button @click="openPlaylistModal(null)" variant="light"><i class="si si-plus"></i></Button>
        </div>
        <div class="all-tracks-section">
          <Button 
            @click="setActivePlaylist(null)"
            :class="{ active: selectedPlaylistIdValue === null }"
            variant="primary"
            class="all-tracks-button"
          >
            All Tracks
          </Button>
        </div>
        <div class="playlist-container">
          <draggable v-model="sortedPlaylists" tag="ul" class="playlist-list" handle=".playlist-item" item-key="id" @end="onPlaylistSortEnd">
            <template #item="{ element: playlist }">
              <li
                @click="setActivePlaylist(playlist.id)"
                :class="{ active: selectedPlaylistIdValue === playlist.id }"
                class="playlist-item"
              >
                <span class="playlist-name">{{ playlist.name }}</span>
                <div class="playlist-actions">
                  <Button @click.stop="openPlaylistModal(playlist)" variant="light"><i class="si si-pencil"></i></Button>
                  <Button @click.stop="removePlaylist(playlist.id)" variant="light"><i class="si si-x"></i></Button>
                </div>
              </li>
            </template>
          </draggable>
        </div>
      </div>
    </template>
    <template #fixed-bottom>
      <JukeboxPlayer :animated-background="true" />
      <PlaylistEditor
        v-model="isPlaylistModalOpen"
        :playlist="playlistToEdit"
      />
      <AddToPlaylistModal
        v-model="isAddToPlaylistModalOpen"
        :track="trackToAddToPlaylist"
      />
    </template>
  </BaseListView>
</template>

<style scoped>
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.sidebar-header h3 {
  margin: 0;
}

.all-tracks-section {
  margin-top: 1rem;
  flex-shrink: 0;
}

.all-tracks-button {
  width: 100%;
  justify-content: flex-start;
  text-align: left;
}

.all-tracks-button.active {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.playlist-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  margin-top: 1rem;
}

.playlist-list {
  list-style: none;
}

.playlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s;
}

.playlist-item:hover {
  background-color: var(--color-border);
}

.playlist-list .sortable-ghost {
  opacity: 0.5;
  background: var(--color-info-light);
}

.playlist-item.active {
  background-color: var(--color-background-mute);
  font-weight: bold;
}

.playlist-name {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.playlist-item:hover .playlist-actions {
  opacity: 1;
}

</style> 

