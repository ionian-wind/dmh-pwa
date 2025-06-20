<template>
  <div class="jukebox-app">
    <div class="jukebox-info">
      <p>{{ persistenceMessage }}</p>
    </div>
    <div v-if="unsupported" class="jukebox-warning">
      <p>This music player only works in Chromium-based browsers (Chrome, Edge, Brave, etc.). Please switch to a supported browser to use the player.</p>
    </div>
    <template v-else>
      <BaseCard :style="artworkColorStyle">
        <PlaylistSelector
          :playlists="playlists"
          :activeId="activePlaylistId"
          @select="onSelectPlaylist"
          @create="onCreatePlaylist"
          @rename="onRenamePlaylist"
          @delete="onDeletePlaylist"
        />
        <FilePicker @files="onFilesSelected" />
        <ArtworkDisplay :artwork="currentArtwork" />
        <PlayerControls
          :isPlaying="isPlaying"
          :currentTime="currentTime"
          :duration="duration"
          :shuffle="shuffle"
          :repeat="repeat"
          @play="() => play(currentTrack)"
          @pause="pause"
          @next="next"
          @prev="prev"
          @seek="seek"
          @toggle-shuffle="toggleShuffle"
          @toggle-repeat="toggleRepeat"
          @audio-error="onAudioError"
        />
        <TrackList :tracks="audioTracks" :current="currentTrack" @select="onSelectTrack" @remove="onRemoveTrack" @reorder="onReorderTracks" />
        <VolumeControl :volume="volume" @change="setVolume" />
      </BaseCard>
      <div v-if="audioError" class="jukebox-warning">
        <p>{{ audioError }}</p>
        <button @click="handleRepick">Re-pick Files</button>
      </div>
      <div v-if="needsRepick" class="jukebox-warning">
        <p>Some or all music files could not be loaded. This may be due to browser security restrictions. Please re-pick your music files to continue playback.</p>
        <button @click="handleRepick">Re-pick Files</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue'
import BaseCard from '../../components/common/BaseCard.vue'
import FilePicker from './FilePicker.vue'
import ArtworkDisplay from './ArtworkDisplay.vue'
import PlayerControls from './PlayerControls.vue'
import TrackList from './TrackList.vue'
import VolumeControl from './VolumeControl.vue'
import PlaylistSelector from './PlaylistSelector.vue'
import { useAudioPlayer } from '../composables/useAudioPlayer'
import { useFileSystem, tracks as jukeboxTracks } from '../composables/useFileSystem'
import { useArtworkColor } from '../composables/useArtworkColor'
import { usePlaylists } from '../composables/usePlaylists'
import { getPersistenceSupportMessage } from '../composables/useFileSystem'

const {
  isPlaying,
  currentTrack,
  tracks: audioTracks,
  volume,
  play,
  pause,
  next,
  prev,
  setVolume,
  currentTime,
  duration,
  seek,
  shuffle,
  repeat,
  toggleShuffle,
  toggleRepeat,
  loadTracksFromStorage,
} = useAudioPlayer()
const { color: artworkColor, extractColor } = useArtworkColor()
const {
  playlists,
  activePlaylist,
  activePlaylistId,
  runtimeTracks,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  setActivePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
} = usePlaylists()
const { pickFiles, unsupported } = useFileSystem()
const persistenceMessage = getPersistenceSupportMessage()
const tracks = jukeboxTracks

const audioError = ref<string | null>(null)
const needsRepick = ref(false)

function onFilesSelected(files: File[]) {
  if (!activePlaylist.value) {
    if (playlists.value.length === 0) {
      createPlaylist('My Playlist')
      setActivePlaylist(playlists.value[0].id)
    } else {
      setActivePlaylist(playlists.value[0].id)
    }
  }
  Promise.all(Array.from(files).map(file => addTrackToPlaylist(file))).then(() => {
    console.log('Playlists after add:', playlists.value);
    console.log('Runtime tracks:', runtimeTracks.value);
    if (runtimeTracks.value.length > 0) {
      audioTracks.value = runtimeTracks.value
      play(runtimeTracks.value[0])
    }
  })
}
function onRemoveTrack(track: any) {
  if (activePlaylist.value) {
    removeTrackFromPlaylist(track.name, activePlaylist.value.id)
    audioTracks.value = runtimeTracks.value
  }
}
function onSelectPlaylist(id: string) {
  setActivePlaylist(id)
  if (runtimeTracks.value.length > 0) {
    audioTracks.value = runtimeTracks.value
    play(runtimeTracks.value[0])
  }
}
function onCreatePlaylist(name: string) {
  createPlaylist(name)
  audioTracks.value = runtimeTracks.value
}
function onRenamePlaylist({ id, name }: { id: string; name: string }) {
  renamePlaylist(id, name)
}
function onDeletePlaylist(id: string) {
  deletePlaylist(id)
  audioTracks.value = runtimeTracks.value
}
function onReorderTracks(newOrder: any[]) {
  if (activePlaylist.value) {
    // newOrder are runtime tracks, convert to stored tracks for persistence
    const storedTracks = newOrder.map((t: any) => {
      const { name, artwork, file } = t
      return { name, artwork, arrayBuffer: undefined, type: file?.type }
    })
    activePlaylist.value.tracks = activePlaylist.value.tracks.sort((a, b) => {
      const idxA = newOrder.findIndex((t: any) => t.name === a.name)
      const idxB = newOrder.findIndex((t: any) => t.name === b.name)
      return idxA - idxB
    })
  }
  audioTracks.value = newOrder
}
function onSelectTrack(track: any) {
  play(track)
}

const currentArtwork = computed(() => currentTrack.value?.artwork || null)

watch(currentArtwork, (artwork) => {
  extractColor(artwork)
})

const artworkColorStyle = computed(() =>
  artworkColor.value ? { '--jukebox-accent': artworkColor.value } : {}
)

function onAudioError(e: Event) {
  const audio = e.target as HTMLAudioElement
  switch (audio.error?.code) {
    case audio.error?.MEDIA_ERR_SRC_NOT_SUPPORTED:
      audioError.value = 'This file type is not supported or could not be loaded. Please re-pick your files.'
      break
    case audio.error?.MEDIA_ERR_NETWORK:
      audioError.value = 'Network error occurred while trying to play the file.'
      break
    case audio.error?.MEDIA_ERR_DECODE:
      audioError.value = 'An error occurred while decoding the audio file.'
      break
    case audio.error?.MEDIA_ERR_ABORTED:
      audioError.value = 'Audio playback was aborted.'
      break
    default:
      audioError.value = 'An unknown error occurred during playback.'
  }
}

async function handleRepick() {
  needsRepick.value = false
}
</script>

<style scoped src="../styles/jukebox.css">
.jukebox-warning {
  background: #fffbe6;
  color: #b26a00;
  border: 1px solid #ffe58f;
  padding: 1em;
  margin: 1em 0;
  border-radius: 6px;
  text-align: center;
}

.jukebox-info {
  background: #e6f7ff;
  color: #0050b3;
  border: 1px solid #91d5ff;
  padding: 1em;
  margin: 1em 0;
  border-radius: 6px;
  text-align: center;
}
</style> 