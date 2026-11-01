<script setup lang="ts">
import type { JukeboxTrack } from '@/jukebox/types';
import AlbumPicture from '@/jukebox/components/AlbumPicture.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  track?: JukeboxTrack | null;
  showArtwork?: boolean;
  artworkSize?: string;
  horizontal?: boolean;
}>();
</script>

<template>
  <div
    :class="{
      'q-gutter-md': true,
      'track-info-row': true,
      row: horizontal,
      column: !horizontal,
      'items-center': !horizontal,
      'justify-center': !horizontal,
    }"
  >
    <!-- Track Artwork -->
    <AlbumPicture v-if="showArtwork" v-bind="props" />
    <!-- Track Info -->
    <div
      :class="{
        'track-info-top': true,
        'text-center': !horizontal,
      }"
    >
      <div class="title text-h6">
        {{ props.track?.title || t('jukebox.noTrackSelected') }}
      </div>
      <div class="artist text-h7">{{ props.track?.artist || '&nbsp;' }}</div>
    </div>
  </div>
</template>
