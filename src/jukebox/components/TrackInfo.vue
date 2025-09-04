<script setup lang="ts">
import type { JukeboxTrack } from '@/jukebox/types';
import AlbumPicture from "@/jukebox/components/AlbumPicture.vue";

const props = defineProps<{
  track?: JukeboxTrack | null;
  showArtwork?: boolean;
  artworkSize?: string;
  horizontal?: boolean;
}>();
</script>

<template>
  <div :class="{
    'q-gutter-x-md': true,
    'row': true,
    'track-info-row': true,
    'items-center': true,
    'justify-start': horizontal,
    'justify-center': !horizontal,
  }">
    <!-- Track Artwork -->
    <AlbumPicture v-if="showArtwork" v-bind="props" />
    <!-- Track Info -->
    <div class="track-info-top">
      <div class="title text-h6">
        {{ props.track?.title || 'No track selected' }}
      </div>
      <div class="artist text-h7">{{ props.track?.artist || '&nbsp;' }}</div>
    </div>
  </div>
</template>
