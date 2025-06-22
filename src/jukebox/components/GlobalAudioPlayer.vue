<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useJukeboxTracksStore, useJukeboxPlaylistsStore, useJukeboxFilesStore } from '@/jukebox/stores';

const audioRef = ref<HTMLAudioElement | null>(null);
const playerStore = useJukeboxPlayerStore();

// Get store instances
const tracksStore = useJukeboxTracksStore();
const playlistsStore = useJukeboxPlaylistsStore();
const filesStore = useJukeboxFilesStore();

onMounted(async () => {
  console.log('🎵 GlobalAudioPlayer: Component mounted, loading stores...');
  
  // Load all stores first
  await Promise.all([
    tracksStore.load(),
    playlistsStore.load(),
    filesStore.load()
  ]);
  
  console.log('🎵 GlobalAudioPlayer: All stores loaded, initializing player...');
  
  // Now initialize the player after stores are loaded
  if (audioRef.value) {
    playerStore.init(audioRef.value);
  }
});
</script> 

<template>
  <audio ref="audioRef" style="display: none;"></audio>
</template> 