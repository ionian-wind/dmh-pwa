<template>
  <div class="jukebox-container">
    <div class="jukebox-layout">
      <!-- Playlist Sidebar -->
      <div class="playlist-sidebar">
        <div class="sidebar-header">
          <h3>Playlists</h3>
          <button @click="openPlaylistModal(null)" class="btn-create-playlist"><i class="si si-plus"></i></button>
        </div>
        <ul class="playlist-list">
          <li
            @click="setActivePlaylist(null)"
            :class="{ active: activePlaylistId === null }"
            class="playlist-item"
          >
            All Tracks
          </li>
        </ul>
        <draggable v-model="sortedPlaylists" tag="ul" class="playlist-list" handle=".playlist-item" item-key="id" @end="onPlaylistSortEnd">
          <template #item="{ element: playlist }">
            <li
              @click="setActivePlaylist(playlist.id)"
              :class="{ active: activePlaylistId === playlist.id }"
              class="playlist-item"
            >
              <span class="playlist-name">{{ playlist.name }}</span>
              <div class="playlist-actions">
                <button @click.stop="openPlaylistModal(playlist)" class="btn-edit"><i class="si si-pencil"></i></button>
                <button @click.stop="removePlaylist(playlist.id)" class="btn-remove"><i class="si si-x"></i></button>
              </div>
            </li>
          </template>
        </draggable>
      </div>

      <!-- Main Content -->
      <div class="jukebox-view">
        <div class="view-header">
          <button @click="pickFiles" class="btn-add-tracks"><i class="si si-plus"></i> Add Tracks</button>
        </div>

        <div class="tracks-wrapper">
          <div v-if="filteredTracks.length">
            <draggable v-if="activePlaylistId" v-model="draggableTracks" tag="ul" class="track-list" handle=".track-item" item-key="id" @end="onTrackSortEnd">
              <template #item="{ element: track }">
                <li
                  :style="{ '--track-color': track.color || 'transparent' }"
                  class="track-item"
                  :class="{ 'is-playing': currentTrack && currentTrack.id === track.id }"
                  @click="playTrack(track)"
                >
                  <div class="track-artwork" :style="{ backgroundImage: `url(${track.picture})` }"></div>
                  <div class="track-info">
                    <span class="track-title">{{ track.title }}</span>
                    <span class="track-artist" v-if="track.artist">- {{ track.artist }}</span>
                  </div>
                  <div class="track-actions">
                    <button @click.stop="openAddToPlaylistModal(track)" class="btn-icon-text"><i class="si si-plus"></i> Add to Playlist</button>
                    <button @click.stop="removeTrack(track)" class="btn-remove"><i class="si si-x"></i></button>
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
                :class="{ 'is-playing': currentTrack && currentTrack.id === track.id }"
                @click="playTrack(track)"
              >
                <div class="track-artwork" :style="{ backgroundImage: `url(${track.picture})` }"></div>
                <div class="track-info">
                  <span class="track-title">{{ track.title }}</span>
                  <span class="track-artist" v-if="track.artist">- {{ track.artist }}</span>
                </div>
                <div class="track-actions">
                  <button @click.stop="openAddToPlaylistModal(track)" class="btn-icon-text"><i class="si si-plus"></i> Add to Playlist</button>
                  <button @click.stop="removeTrack(track)" class="btn-remove"><i class="si si-x"></i></button>
                </div>
              </li>
            </ul>
          </div>
          <div v-else class="no-tracks">
            <p>No tracks to display. Add some tracks to get started!</p>
          </div>
        </div>

        <JukeboxPlayer
          :tracks="filteredTracks"
          :playlist-id="activePlaylistId"
          @track-change="handleTrackChange"
          ref="playerRef"
        />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import draggable from 'vuedraggable';
import { pickAudioFiles, getFileFromHandle, getAudioMetadata, extractTrackMetadata } from '@/jukebox/FileSystemUtils';
import { useJukeboxTracksStore, useJukeboxPlaylistsStore, useJukeboxFilesStore, deleteJukeboxFile } from '@/jukebox/stores';
import PlaylistEditor from '@/jukebox/components/PlaylistEditor.vue';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import type { JukeboxPlaylist, JukeboxTrack } from '@/jukebox/types';
import { useConfigStore } from '@/utils/configStore';

const tracksStore = useJukeboxTracksStore();
const playlistsStore = useJukeboxPlaylistsStore();
const filesStore = useJukeboxFilesStore();
const configStore = useConfigStore();

const tracks = tracksStore.items;
const playlists = playlistsStore.items;

const sortedPlaylists = ref<JukeboxPlaylist[]>([]);
watch(playlists, (newPlaylists) => {
  sortedPlaylists.value = [...newPlaylists].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}, { immediate: true, deep: true });

const activePlaylistId = ref<string | null>(null);

const isPlaylistModalOpen = ref(false);
const playlistToEdit = ref<JukeboxPlaylist | null>(null);

const isAddingTracks = ref(false);
const isAddToPlaylistModalOpen = ref(false);
const trackToAddToPlaylist = ref<JukeboxTrack | null>(null);

// Player reference
const playerRef = ref<InstanceType<typeof JukeboxPlayer> | null>(null);
const currentTrack = ref<JukeboxTrack | null>(null);

function openPlaylistModal(playlist: JukeboxPlaylist | null) {
  playlistToEdit.value = playlist;
  isPlaylistModalOpen.value = true;
}

function openAddToPlaylistModal(track: JukeboxTrack) {
  trackToAddToPlaylist.value = track;
  isAddToPlaylistModalOpen.value = true;
}

function setActivePlaylist(playlistId: string | null) {
  activePlaylistId.value = playlistId;
  // Save to config store for persistence
  configStore.activePlaylistId = playlistId;
}

async function removePlaylist(playlistId: string) {
  if (activePlaylistId.value === playlistId) {
    activePlaylistId.value = null;
    // Save the change to config store
    configStore.activePlaylistId = null;
  }
  await playlistsStore.remove(playlistId);
}

async function removeTrack(track: JukeboxTrack) {
  // 1. Remove file handle
  if (track.fileId) {
    try {
      await deleteJukeboxFile(track.fileId);
    } catch (e) {
      console.error(`Failed to delete file handle for track ${track.id}:`, e);
    }
  }

  // 2. Remove track from all playlists
  const updates = playlists.value.map(playlist => {
    if (playlist.trackIds.includes(track.id)) {
      const newTrackIds = playlist.trackIds.filter(tid => tid !== track.id);
      return playlistsStore.update(playlist.id, { ...playlist, trackIds: newTrackIds });
    }
    return Promise.resolve();
  });
  await Promise.all(updates);

  // 3. Remove track itself
  await tracksStore.remove(track.id);
}

const filteredTracks = computed(() => {
  if (!activePlaylistId.value) {
    return tracks.value;
  }
  const activePlaylist = playlists.value.find((p: JukeboxPlaylist) => p.id === activePlaylistId.value);
  if (!activePlaylist) {
    return [];
  }
  // Preserve sort order from playlist
  return activePlaylist.trackIds.map(trackId => tracks.value.find(t => t.id === trackId)).filter(Boolean) as JukeboxTrack[];
});

const draggableTracks = ref<JukeboxTrack[]>([]);
watch(filteredTracks, (newTracks) => {
  draggableTracks.value = [...newTracks];
}, { immediate: true });

async function onPlaylistSortEnd() {
  const updatePromises = sortedPlaylists.value.map((playlist, index) => {
    if (playlist.sortOrder !== index) {
      // Create a plain object for the update to avoid passing proxies
      return playlistsStore.update(playlist.id, { sortOrder: index });
    }
    return null;
  }).filter(Boolean);

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
    // After all updates are done, reload from the store to ensure consistency
    // This is a simple way to get the fresh, correctly-sorted data back
    await playlistsStore.load();
  }
}

async function onTrackSortEnd() {
  if (!activePlaylistId.value) return;

  const activePlaylist = playlists.value.find(p => p.id === activePlaylistId.value);
  if (activePlaylist) {
    const newTrackIds = draggableTracks.value.map(t => t.id);
    await playlistsStore.update(activePlaylist.id, { trackIds: newTrackIds });
  }
}

function isFileSystemFileHandle(obj: any): obj is FileSystemFileHandle {
  return obj && typeof obj === 'object' && typeof obj.getFile === 'function' && typeof obj.name === 'string';
}

async function pickFiles() {
  isAddingTracks.value = true;
  try {
    const handles = await pickAudioFiles();
    if (!handles || handles.length === 0) {
      // User cancelled the file picker
      isAddingTracks.value = false;
      return;
    }

    for (const handle of handles) {
      if (!isFileSystemFileHandle(handle)) {
        console.warn('Skipped non-file handle:', handle);
        continue;
      }
      const file = await getFileFromHandle(handle);
      const fileId = `${file.name}-${file.lastModified}-${file.size}`;
      
      filesStore.create({
        handle,
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      });

      const [duration, meta] = await Promise.all([
        getAudioMetadata(file),
        extractTrackMetadata(file),
      ]);

      tracksStore.create({
        fileId,
        title: meta.title || file.name,
        artist: meta.artist,
        album: meta.album,
        duration: duration.duration,
        artworkUrl: meta.picture,
        playlistIds: [],
        genre: meta.genre,
        year: meta.year,
        trackNumber: meta.trackNumber,
        discNumber: meta.discNumber,
        composer: meta.composer,
        comment: meta.comment,
        lyrics: meta.lyrics,
        picture: meta.picture,
        color: meta.color,
      });
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // User cancelled the file picker, do nothing.
    } else {
      console.error('Failed to add tracks:', error);
      // Optionally, show an error message to the user
    }
  } finally {
    isAddingTracks.value = false;
  }
}

// Player interaction functions
function playTrack(track: JukeboxTrack) {
  if (playerRef.value) {
    playerRef.value.playTrack(track);
  }
}

function handleTrackChange(track: JukeboxTrack | null) {
  currentTrack.value = track;
}

onMounted(async () => {
  // Wait for all stores to load first
  await Promise.all([
    tracksStore.load(),
    playlistsStore.load(),
    filesStore.load()
  ]);
  
  // Restore active playlist from config store
  if (configStore.activePlaylistId !== undefined) {
    activePlaylistId.value = configStore.activePlaylistId;
    console.log('Restored active playlist:', activePlaylistId.value);
  } else {
    console.log('No active playlist to restore, defaulting to "All Tracks"');
  }
});
</script>

<style scoped>
.jukebox-container {
  height: calc(100vh - var(--header-height)); /* Adjust 60px based on your header height */
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
}

.jukebox-layout {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

.playlist-sidebar {
  width: 250px;
  flex-shrink: 0;
  border-right: 1px solid #ccc;
  padding: 1rem;
  overflow-y: auto;
  background: #f9f9f9;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
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

.playlist-list {
  list-style: none;
  padding: 0;
  margin: 0;
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
  background-color: #eee;
}

.playlist-list .sortable-ghost {
  opacity: 0.5;
  background: #c8ebfb;
}

.playlist-item.active {
  background-color: #e0e0e0;
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
}

.playlist-actions button {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
}

.playlist-actions button:hover {
  color: #333;
}

.jukebox-view {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}


.btn-add-tracks {
  background: var(--primary-color, #4f46e5);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-add-tracks:hover {
  background: var(--primary-color-dark, #3730a3);
}

.tracks-wrapper {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem;
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
  background: white;
  border: 1px solid #eee;
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.track-item.is-playing {
  background: #f0f8ff;
  border-color: var(--track-color, #4f46e5);
}

.track-item.is-playing::before {
  width: 8px;
}

.track-artwork {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background-size: cover;
  background-position: center;
  background-color: #f0f0f0;
  margin-right: 1rem;
  flex-shrink: 0;
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
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
}

.btn-icon-text {
  background: none;
  border: 1px solid #ddd;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  color: #666;
  transition: all 0.2s;
}

.btn-icon-text:hover {
  background: #f5f5f5;
  color: #333;
}

.btn-remove {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: #fee;
  color: #e53e3e;
}

.no-tracks {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.no-tracks p {
  margin: 0;
  font-size: 1.1rem;
}
</style> 
