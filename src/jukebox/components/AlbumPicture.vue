<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { IconMusic } from '@tabler/icons-vue';
import type { JukeboxTrack } from "@/jukebox/types";
import { usePictureUrlCacheStore } from '@/jukebox/stores';

const pictureUrlCacheStore = usePictureUrlCacheStore();

// Use the shared store for picture handling
const { getPictureStyle } = pictureUrlCacheStore;

const props = defineProps<{
  track?: JukeboxTrack | null;
  artworkSize?: string;
}>();

// Create computed property for picture style
const pictureStyle = computed(() => {
  return getPictureStyle(props.track?.picture);
});

// Clean up created URLs on component unmount
onBeforeUnmount(() => {
  pictureUrlCacheStore.clearCache();
});
</script>

<template>
  <QAvatar
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
</template>
