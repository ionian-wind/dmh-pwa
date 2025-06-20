<template>
  <div class="jukebox-container" :style="{ paddingBottom: playerHeight }">
    <!-- Playlist Sidebar -->
    <div class="playlist-sidebar">
      <h3>Playlists</h3>
      <button @click="openPlaylistModal(null)">Create Playlist</button>
      <ul class="playlist-list">
        <li
          @click="setActivePlaylist(null)"
          :class="{ active: activePlaylistId === null }"
        >
          All Tracks
        </li>
        <li
          v-for="playlist in playlists"
          :key="playlist.id"
          @click="setActivePlaylist(playlist.id)"
          :class="{ active: activePlaylistId === playlist.id }"
        >
          {{ playlist.name }}
          <button @click.stop="openPlaylistModal(playlist)">Edit</button>
        </li>
      </ul>
    </div>

    <!-- Main Content -->
    <div class="jukebox-view">
      <h1>Jukebox</h1>
      <button @click="pickFiles">Add Tracks</button>
      <div v-if="filteredTracks.length">
        <h2>Tracks</h2>
        <ul>
          <li
            v-for="track in filteredTracks"
            :key="track.id"
            :style="{ '--track-color': track.color || 'transparent' }"
            class="track-item"
          >
            <div class="track-artwork" :style="{ backgroundImage: `url(${track.picture})` }"></div>
            <div class="track-info">
              <span class="track-title">{{ track.title }}</span>
              <span class="track-artist" v-if="track.artist">- {{ track.artist }}</span>
            </div>
            <button @click="openAddToPlaylistModal(track)">Add to Playlist</button>
            <button @click="playTrack(track)">Play</button>
          </li>
        </ul>
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

    <JukeboxPlayer
      :track="currentTrack"
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="duration"
      @toggle-play="togglePlay"
      @next="playNext"
      @prev="playPrev"
      @seek="handleSeek"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { pickAudioFiles, getFileFromHandle, getAudioMetadata, extractTrackMetadata } from '@/jukebox/FileSystemUtils';
import { useJukeboxTracksStore, useJukeboxPlaylistsStore, useJukeboxFilesStore, putJukeboxFile, getJukeboxFile } from '@/jukebox/stores';
import { generateId } from '@/utils/storage';
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
const playerHeight = ref('120px'); // To prevent content from hiding behind fixed player

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

const filteredTracks = computed(() => {
  if (!activePlaylistId.value) {
    return tracks.value;
  }
  const activePlaylist = playlists.value.find((p: JukeboxPlaylist) => p.id === activePlaylistId.value);
  if (!activePlaylist) {
    return [];
  }
  return tracks.value.filter((track: JukeboxTrack) => activePlaylist.trackIds.includes(track.id));
});

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
  if (!audioRef.value || !currentTrack.value) return;
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
  setupAudioEvents();
});
</script>

<style scoped>
.jukebox-container {
  display: flex;
  gap: 2em;
  padding-bottom: 120px;
}

.playlist-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #ccc;
  padding-right: 2em;
}

.playlist-list {
  list-style: none;
  padding: 0;
  margin-top: 1em;
}

.playlist-list li {
  padding: 0.5em;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 0.5em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.playlist-list li:hover {
  background-color: #f0f0f0;
}

.playlist-list li.active {
  background-color: #e0e0f0;
  font-weight: bold;
}

.jukebox-view {
  flex-grow: 1;
}

.track-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 8px;
  background-color: #f9f9f9;
  border-left: 8px solid var(--track-color);
  transition: background-color 0.3s;
}

.track-item:hover {
  background-color: #f0f0f0;
}

.track-artwork {
  width: 50px;
  height: 50px;
  margin-right: 12px;
  background-size: cover;
  background-position: center;
  background-color: #e0e0e0;
  border-radius: 4px;
  flex-shrink: 0;
}

.track-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.track-title {
  font-weight: bold;
}

.track-artist {
  font-size: 0.9em;
  color: #555;
}

button {
  margin-left: 12px;
}
</style> 