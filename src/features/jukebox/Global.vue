<script setup lang="ts">
import { onMounted, watch } from 'vue';
import SoundControlDialog from '@/jukebox/components/SoundControlDialog.vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { usePageContentRect } from '@/composables/usePageContentRect';
import { soundControlOpen } from './state';

const pageContentRect = usePageContentRect();
const playerStore = useJukeboxPlayerStore();

onMounted(() => {
  pageContentRect.update();
  void playerStore.init();
});
watch(soundControlOpen, (open) => {
  if (open) pageContentRect.update();
});
</script>

<template>
  <SoundControlDialog
    v-model="soundControlOpen"
    :content-left="pageContentRect.left.value"
    :content-width="pageContentRect.width.value"
  />
</template>
