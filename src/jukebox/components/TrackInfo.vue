<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';

import { IconMusic } from '@tabler/icons-vue';

import type { JukeboxTrack } from '@/jukebox/types';
import { usePictureUrlCacheStore } from '@/jukebox/stores';

const props = defineProps<{
  track?: JukeboxTrack | null;
  showArtwork?: boolean;
  artworkSize?: string;
}>();

const trackColor = computed(() => props.track?.color || 'transparent');
const pictureUrlCacheStore = usePictureUrlCacheStore();

// Use the shared store for picture handling
const { getPictureStyle } = pictureUrlCacheStore;

// Create computed property for picture style
const pictureStyle = computed(() => {
  return getPictureStyle(props.track?.picture);
});

onMounted(() => {
  console.log(props.track);
});
// Clean up created URLs on component unmount
onBeforeUnmount(() => {
  pictureUrlCacheStore.clearCache();
});
</script>
<template>
  <div class="track-info-row">
    <!-- Track Artwork -->
    <QAvatar
      v-if="showArtwork"
      :size="props.artworkSize ?? '200px'"
      rounded
      class="track-artwork-container"
    >
      <div
        v-if="props.track?.picture"
        :style="pictureStyle"
        class="track-artwork"
      ></div>
      <div v-else class="track-artwork track-artwork-placeholder">
        <IconMusic width="80" height="80" />
      </div>
    </QAvatar>
    <!-- Track Info -->
    <div class="track-info-top">
      <div class="title text-h5">
        {{ props.track?.title || 'No track selected' }}
      </div>
      <div class="artist text-h6">{{ props.track?.artist || '&nbsp;' }}</div>
    </div>
  </div>
</template>
