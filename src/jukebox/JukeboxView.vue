<script setup lang="ts">
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue';
import draggable from 'vuedraggable';
import { pickAudioFiles, getFileFromHandle, extractTrackMetadata } from '@/jukebox/FileSystemUtils';
import { useJukeboxTracksStore, useJukeboxPlaylistsStore, useJukeboxFilesStore, deleteJukeboxFile, putJukeboxFile, getJukeboxFile, usePictureUrlCacheStore } from '@/jukebox/stores';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import PlaylistEditor from '@/jukebox/components/PlaylistEditor.vue';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import type { JukeboxPlaylist, JukeboxTrack } from '@/jukebox/types';
import { useConfigStore } from '@/utils/configStore';
import Button from '@/components/common/Button.vue';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import { useModuleStore } from '@/stores/modules';
import {formatTime} from "./utils";

const tracksStore = useJukeboxTracksStore();
const playlistsStore = useJukeboxPlaylistsStore();
const filesStore = useJukeboxFilesStore();
const configStore = useConfigStore();
const playerStore = useJukeboxPlayerStore();
const moduleStore = useModuleStore();
const pictureUrlCacheStore = usePictureUrlCacheStore();

const tracks = tracksStore.items;
const playlists = playlistsStore.items;

// Filter playlists by current module filter
const filteredPlaylists = computed(() => {
  let result = playlists.value || [];
  // Module filter - filter playlists by current module filter
  result = result.filter(playlist => moduleStore.matchesModuleFilterMultiple(playlist.moduleIds || []));
  return result;
});

// Use filtered playlists but ensure currently selected playlist is included
const sortedPlaylists = ref<JukeboxPlaylist[]>([]);
const selectedPlaylistId = ref<string | null>(configStore.activePlaylistId ?? null);

// Watch filtered playlists and selectedPlaylistId separately to avoid watch source issues
watch(filteredPlaylists, (newPlaylists) => {
  updateSortedPlaylists(newPlaylists, selectedPlaylistId.value);
}, { immediate: true, deep: true });

watch(selectedPlaylistId, (currentPlaylistId) => {
  updateSortedPlaylists(filteredPlaylists.value, currentPlaylistId);
}, { immediate: true });

function updateSortedPlaylists(newPlaylists: JukeboxPlaylist[], currentPlaylistId: string | null) {
  // Defensive check to ensure newPlaylists is an array
  if (!newPlaylists || !Array.isArray(newPlaylists)) {
    console.warn('Playlists is not an array:', newPlaylists);
    sortedPlaylists.value = [];
    return;
  }
  
  let filteredPlaylists = [...newPlaylists].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  
  // If there's a currently selected playlist, make sure it's included even if filtered out
  if (currentPlaylistId) {
    const currentPlaylist = playlists.value.find((p: JukeboxPlaylist) => p.id === currentPlaylistId);
    if (currentPlaylist && !filteredPlaylists.find((p: JukeboxPlaylist) => p.id === currentPlaylistId)) {
      filteredPlaylists.push(currentPlaylist);
      // Re-sort after adding the current playlist
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

// Remove the local caching logic and use the store instead
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
  selectedPlaylistId.value = playlistId;
  // Do NOT update configStore.activePlaylistId here - it should only be updated when playback starts
}

function playTrackFromPlaylist(track: JukeboxTrack) {
  // When a track is played, update the config to reflect the playlist from which it was started
  configStore.activePlaylistId = selectedPlaylistId.value;
  console.log('🎵 JukeboxView: Playing track from playlist, updated config.activePlaylistId to:', selectedPlaylistId.value);
  playerStore.playTrack(track);
}

async function removePlaylist(playlistId: string) {
  if (selectedPlaylistId.value === playlistId) {
    selectedPlaylistId.value = null;
    configStore.activePlaylistId = null;
  }
  await playlistsStore.remove(playlistId);
}

async function removeTrack(track: JukeboxTrack) {
  const isCurrentlyPlaying = playerStore.currentTrack?.id === track.id;

  // Remove the track from the current queue
  const currentQueue = playerStore.queue;
  const newQueue = currentQueue.filter((t: JukeboxTrack) => t.id !== track.id);
  playerStore.setQueue(newQueue, playerStore.currentQueueId);

  // If we deleted the currently playing track and there are more tracks in the queue, play the next one
  if (isCurrentlyPlaying && newQueue.length > 0) {
    const nextTrackIndex = Math.min(currentQueue.findIndex(t => t.id === track.id), newQueue.length - 1);
    const nextTrack = newQueue[nextTrackIndex];
    if (nextTrack) {
      await playerStore.playTrack(nextTrack);
    }
  } else if (isCurrentlyPlaying) {
    // Only stop if there are no more tracks to play
    playerStore.stop();
  }

  // Find all playlists that contain the track
  const playlistsToUpdate = playlistsStore.items.value.filter((p: JukeboxPlaylist) => p.trackIds.includes(track.id));

  // Update these playlists by removing the track ID
  const updatePromises = playlistsToUpdate.map(p => {
    const newTrackIds = p.trackIds.filter((tid: string) => tid !== track.id);
    return playlistsStore.update(p.id, { trackIds: newTrackIds });
  });
  await Promise.all(updatePromises);
  
  // Remove the track itself from the main track store
  await tracksStore.remove(track.id);

  // If a file is associated, delete it from IndexedDB
  if (track.fileId) {
    try {
      await deleteJukeboxFile(track.fileId);
    } catch (e) {
      console.error(`Failed to delete file handle for track ${track.id}:`, e);
    }
  }

  // Manually update the local draggableTracks to reflect the change immediately
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
  // Update the global player's queue if the context changes
  if (configStore.activePlaylistId === selectedPlaylistId.value) {
    playerStore.setQueue(newTracks, configStore.activePlaylistId);
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
        picture: trackMeta.picture, // This is a blob URL
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

    // If a playlist is active, add the new tracks to it
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

function onTrackSortEnd(_event: any) {
  if (!selectedPlaylistId.value) return;
  const playlist = playlistsStore.items.value.find((p: JukeboxPlaylist) => p.id === selectedPlaylistId.value);
  if (!playlist) return;
  
  const newTrackIds = draggableTracks.value.map(t => t.id);
  playlistsStore.update(playlist.id, { ...playlist, trackIds: newTrackIds });
  
  if (configStore.activePlaylistId === selectedPlaylistId.value) {
    playerStore.setQueue(draggableTracks.value, selectedPlaylistId.value);
  }
}

const trackIsActive = (track: JukeboxTrack): boolean => 
  Boolean(playerStore.currentTrack && 
  playerStore.currentTrack.id === track.id && 
  configStore.activePlaylistId === selectedPlaylistId.value);

const trackClick = (track: JukeboxTrack) => trackIsActive(track) ? playerStore.togglePlay() : playTrackFromPlaylist(track);

onMounted(async () => {
  await Promise.all([
    tracksStore.load(),
    playlistsStore.load(),
    filesStore.load(),
    moduleStore.load(),
  ]);
  
  if (configStore.activePlaylistId !== undefined) {
    selectedPlaylistId.value = configStore.activePlaylistId;
  }

  // Set initial queue
  playerStore.setQueue(filteredTracks.value, selectedPlaylistId.value);
});

onBeforeUnmount(() => {
  pictureUrlCacheStore.clearCache();
});
</script>

<template>
  <BaseEntityView
    :entity="{ loaded: true }"  
    entity-name="Jukebox"
    list-route="/"
    :loading="false"
    :not-found="false"
  >
    <template #actions>
      <Button @click="pickFiles" variant="primary" title="Add Tracks">
        <i class="si si-plus"></i>
      </Button>
    </template>

    <template #sidepanel>
      <div class="playlist-sidebar">
        <div class="sidebar-header">
          <h3>Playlists</h3>
          <Button @click="openPlaylistModal(null)" variant="light"><i class="si si-plus"></i></Button>
        </div>
        <div class="all-tracks-section">
          <Button 
            @click="setActivePlaylist(null)"
            :class="{ active: selectedPlaylistId === null }"
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
                :class="{ active: selectedPlaylistId === playlist.id }"
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

    <div class="jukebox-main-content">
      <div class="tracks-wrapper">
        <div v-if="filteredTracks.length">
          <draggable v-if="selectedPlaylistId" v-model="draggableTracks" tag="ul" class="track-list" handle=".playlist-item" item-key="id" @end="onTrackSortEnd">
            <template #item="{ element: track }">
              <li
                :style="{ '--track-color': track.color || 'transparent' }"
                class="track-item"
                :class="{ 'is-selected': trackIsActive(track), 'is-playing': playerStore.isPlaying && trackIsActive(track) }"
                @click="trackClick(track)"
              >
                <div v-if="track.picture" :style="getPictureStyle(track.picture)" class="track-artwork">
                  <i class="si si-play"></i>
                  <i class="si si-pause"></i>
                </div>
                <div v-else class="track-artwork track-artwork-placeholder">
                  <i class="si si-music-note"></i>
                  <i class="si si-play"></i>
                  <i class="si si-pause"></i>
                </div>
                <div class="track-info">
                  <span class="track-title">{{ track.title }}</span>
                  <span class="track-artist" v-if="track.artist">- {{ track.artist }}</span>
                </div>
                <div class="track-duration">{{ formatTime(track.duration) }}</div>
                <div class="track-actions">
                  <Button variant="light" @click.stop="openAddToPlaylistModal(track)"><i class="si si-plus"></i> Add to Playlist</Button>
                  <Button variant="light" @click.stop="removeTrack(track)"><i class="si si-x"></i></Button>
                </div>
              </li>
            </template>
          </draggable>
          <ul v-else class="track-list">
            <li
              v-for="track in filteredTracks"
              :key="track.id"
              :style="{ '--track-color': track.color || 'transparent' }"
              class="track-item"
              :class="{ 'is-selected': trackIsActive(track), 'is-playing': playerStore.isPlaying && trackIsActive(track) }"
              @click="trackClick(track)"
            >
              <div v-if="track.picture" :style="getPictureStyle(track.picture)" class="track-artwork">
                <i class="si si-play"></i>
                <i class="si si-pause"></i>
              </div>
              <div v-else class="track-artwork track-artwork-placeholder">
                <i class="si si-music-note"></i>
                <i class="si si-play"></i>
                <i class="si si-pause"></i>
              </div>
              <div class="track-info">
                <span class="track-title">{{ track.title }}</span>
                <span class="track-artist" v-if="track.artist">- {{ track.artist }}</span>
              </div>
              <div class="track-duration">{{ formatTime(track.duration || 0) }}</div>
              <div class="track-actions">
                <Button variant="light" @click.stop="openAddToPlaylistModal(track)"><i class="si si-plus"></i> Add to Playlist</Button>
                <Button variant="light" @click.stop="removeTrack(track)"><i class="si si-x"></i></Button>
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="no-tracks">
          <p>No tracks to display. Add some tracks to get started!</p>
        </div>
      </div>
      <div class="jukebox-player-fixed">
        <JukeboxPlayer :animated-background="true" />
      </div>
    </div>

    <PlaylistEditor
      v-model="isPlaylistModalOpen"
      :playlist="playlistToEdit"
    />
    <AddToPlaylistModal
      v-model="isAddToPlaylistModalOpen"
      :track="trackToAddToPlaylist"
    />
  </BaseEntityView>
</template>

<style scoped>
.jukebox-main-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
}
.tracks-wrapper {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}
.jukebox-player-fixed {
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
}
.view-root {
  height: calc(100vh - var(--header-height));
  overflow: hidden;
}

.jukebox-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.jukebox-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-wrapper {
  display: flex;
  width: calc(250px + 16px);
  flex-shrink: 0;
  transition: width 0.3s ease;
}

.sidebar-wrapper.collapsed {
  width: 16px;
}

.playlist-sidebar {
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.sidebar-header h3 {
  margin: 0;
}

.btn-create-playlist {
  width: 32px;
  height: 32px;
  font-size: 1.5rem;
  line-height: 1;
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
  background-color: var(--color-border-light);
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

.jukebox-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.track-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.track-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  position: relative;
  overflow: hidden;
}

.track-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--track-color, transparent);
  transition: width 0.2s;
}

.track-item:hover::before {
  width: 8px;
}

.track-item:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
}

.track-item.is-selected {
  background: var(--color-info-light);
}

.track-item.is-selected::before {
  width: 8px;
}

.track-artwork {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background-size: cover;
  background-position: center;
  margin-right: 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-lighter);
  font-size: 24px;
}

.track-artwork-placeholder {
  background-color: var(--color-background-mute);
}

.track-info {
  flex-grow: 1;
  min-width: 0;
}

.track-title {
  font-weight: 500;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.9em;
  color: var(--color-text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-actions {
  gap: 0.5rem;
  margin-left: 1rem;
  opacity: 0;
  display: none;
}

.track-item:hover .track-actions {
  display: flex;
  opacity: 1;
}

.no-tracks {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-light);;
}

.no-tracks p {
  margin: 0;
  font-size: 1.1rem;
}

.jukebox-container .jukebox-player {
  padding: 1em;
  background: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  min-width: 600px;
  position: relative;
}

.playlist-toggle-handle {
  width: 16px;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  background: linear-gradient(90deg, var(--color-background-soft) 0%, var(--color-background-mute) 100%);
  border-right: 1px solid var(--color-border-dark);
}

.track-item .si-play, .track-item .si-pause {
  display: none;
}

.track-item:hover .si-music-note {
  display: none;
}

.track-item:not(.is-playing):hover .si-play {
  display: inline-flex;
}

.track-item.is-playing:hover .si-pause {
  display: inline-flex;
}

</style> 

