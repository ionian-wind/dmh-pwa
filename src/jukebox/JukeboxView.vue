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

        <JukeboxPlayer
          :track="currentTrack"
          :is-playing="isPlaying"
          :current-time="currentTime"
          :duration="duration"
          :volume="volume"
          @toggle-play="togglePlay"
          @next="playNext"
          @prev="playPrev"
          @seek="handleSeek"
          @volumechange="handleVolumeChange"
          @togglemute="toggleMute"
        />

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
      </div>
    </div>

    <audio ref="audioRef" @timeupdate="onTimeUpdate" @ended="playNext" @loadedmetadata="onLoadedMetadata"></audio>

    <PlaylistEditor
      v-model="isPlaylistModalOpen"
      :playlist="playlistToEdit"
      @seek="handleSeek"
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
import { useJukeboxTracksStore, useJukeboxPlaylistsStore, useJukeboxFilesStore, getJukeboxFile, deleteJukeboxFile } from '@/jukebox/stores';
import PlaylistEditor from '@/jukebox/components/PlaylistEditor.vue';
import AddToPlaylistModal from '@/jukebox/components/AddToPlaylistModal.vue';
import JukeboxPlayer from '@/jukebox/components/JukeboxPlayer.vue';
import type { JukeboxPlaylist, JukeboxTrack } from '@/jukebox/types';


const audioRef = ref<HTMLAudioElement | null>(null);
const tracksStore = useJukeboxTracksStore();
const playlistsStore = useJukeboxPlaylistsStore();
const filesStore = useJukeboxFilesStore();

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

// Player State
const currentTrack = ref<JukeboxTrack | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const lastVolume = ref(1);

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
}

async function removePlaylist(playlistId: string) {
  if (activePlaylistId.value === playlistId) {
    activePlaylistId.value = null;
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
  // The v-model on draggable component already updated the local `sortedPlaylists` ref array order.
  // Now, we need to persist this new order by updating the 'sortOrder' field.
  for (let i = 0; i < sortedPlaylists.value.length; i++) {
    const playlist = sortedPlaylists.value[i];
    if (playlist.sortOrder !== i) {
      await playlistsStore.update(playlist.id, { sortOrder: i });
    }
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

async function verifyFilePermission(handle: FileSystemFileHandle, mode: 'read' | 'readwrite' = 'read') {
  // @ts-ignore
  if ((await handle.queryPermission({ mode })) === 'granted') {
    return true;
  }
  // @ts-ignore
  if ((await handle.requestPermission({ mode })) === 'granted') {
    return true;
  }
  return false;
}

async function playTrack(track: JukeboxTrack) {
  if (!audioRef.value) return;

  currentTrack.value = track;
  const fileRecord = await getJukeboxFile(track.fileId);
  if (!fileRecord || !isFileSystemFileHandle(fileRecord.handle)) return;

  const handle = fileRecord.handle;
  const hasPerm = await verifyFilePermission(handle, 'read');
  if (!hasPerm) return;

  const file = await getFileFromHandle(handle);
  audioRef.value.src = URL.createObjectURL(file);
  audioRef.value.play();
}

function togglePlay() {
  if (!audioRef.value) return;

  // If no track is selected, play the first one in the list.
  if (!currentTrack.value) {
    if (filteredTracks.value.length > 0) {
      playTrack(filteredTracks.value[0]);
    }
    return;
  }

  // If a track is selected, toggle play/pause.
  if (isPlaying.value) {
    audioRef.value.pause();
  } else {
    audioRef.value.play();
  }
}

function findCurrentTrackIndex(): number {
  if (!currentTrack.value) return -1;
  return filteredTracks.value.findIndex(t => t.id === currentTrack.value?.id);
}

function playNext() {
  const currentIndex = findCurrentTrackIndex();
  if (currentIndex > -1 && currentIndex < filteredTracks.value.length - 1) {
    playTrack(filteredTracks.value[currentIndex + 1]);
  }
}

function playPrev() {
  const currentIndex = findCurrentTrackIndex();
  if (currentIndex > 0) {
    playTrack(filteredTracks.value[currentIndex - 1]);
  }
}

function handleSeek(newTime: number) {
  if (audioRef.value) {
    audioRef.value.currentTime = newTime;
    currentTime.value = newTime;
  }
}

function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
    isPlaying.value = !audioRef.value.paused;
  }
}

function onLoadedMetadata() {
  if (audioRef.value) {
    duration.value = audioRef.value.duration;
  }
}

function handleVolumeChange(newVolume: number) {
  volume.value = newVolume;
  if (newVolume > 0) {
    lastVolume.value = newVolume;
  }
  if (audioRef.value) {
    audioRef.value.volume = newVolume;
  }
  localStorage.setItem('jukebox-volume', newVolume.toString());
}

function toggleMute() {
  if (volume.value > 0) {
    lastVolume.value = volume.value;
    handleVolumeChange(0);
  } else {
    handleVolumeChange(lastVolume.value > 0 ? lastVolume.value : 1);
  }
}

function setupAudioEvents() {
  audioRef.value = new Audio();
  audioRef.value.addEventListener('play', () => { isPlaying.value = true; });
  audioRef.value.addEventListener('pause', () => { isPlaying.value = false; });
  audioRef.value.addEventListener('timeupdate', () => { currentTime.value = audioRef.value?.currentTime || 0; });
  audioRef.value.addEventListener('loadedmetadata', () => { duration.value = audioRef.value?.duration || 0; });
  audioRef.value.addEventListener('ended', playNext);
}

onMounted(() => {
  tracksStore.load();
  playlistsStore.load();
  filesStore.load();
  const savedVolume = localStorage.getItem('jukebox-volume');
  if (savedVolume !== null) {
    const parsedVolume = parseFloat(savedVolume);
    volume.value = parsedVolume;
    if (parsedVolume > 0) {
      lastVolume.value = parsedVolume;
    }
  }
  if (audioRef.value) {
    audioRef.value.volume = volume.value;
  }
  setupAudioEvents();
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
}

.jukebox-view {
  flex-grow: 1;
  padding: 1rem 1rem 0 1rem;
  display: flex;
  flex-direction: column;
}

.tracks-wrapper {
  flex-grow: 1;
  overflow-y: auto;
}

.track-list {
  list-style: none;
  padding: 0;
}

.track-list .sortable-ghost {
  opacity: 0.5;
  background: #c8ebfb;
}

.track-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-left: 5px solid var(--track-color, #ccc);
  cursor: pointer;
}

.track-item.is-playing {
  background-color: #e6f7ff;
  border-left-color: #1890ff;
}

.track-artwork {
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  background-color: #eee;
  border-radius: 4px;
  margin-right: 1rem;
}

.track-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.track-title {
  font-weight: bold;
}

.track-artist {
  font-size: 0.9rem;
  color: #666;
}

.track-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-remove {
  background: none;
  border: none;
  color: #888;
  font-size: 1.5rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  transition: color 0.2s;
}

.btn-remove:hover {
  color: #dc3545;
}

.btn-edit {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
  color: #888;
}

.btn-edit:hover {
  color: var(--primary-color);
}

.no-tracks {
  text-align: center;
  margin-top: 4rem;
  color: #888;
}
</style> 