<script setup lang="ts">
import { onMounted } from 'vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';

const playerStore = useJukeboxPlayerStore();

onMounted(async () => {
  await playerStore.init();
});
</script> 

<template>
  <!-- No audio element needed, handled by Howler.js -->
</template> 
