<script setup lang="ts">
import { computed } from 'vue';
import { IconPlus, IconX } from '@tabler/icons-vue';

import type { JukeboxTrack } from '@/jukebox/types';

import { formatTime } from '../utils';
import { usePictureUrlCacheStore } from '@/jukebox/stores';
import TrackInfo from './TrackInfo.vue';

const props = defineProps<{
  track: JukeboxTrack;
  isSelected?: boolean;
  isPlaying?: boolean;
  draggable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'add-to-playlist', track: JukeboxTrack): void;
  (e: 'remove', track: JukeboxTrack): void;
  (e: 'play', track: JukeboxTrack): void;
}>();

const handleAddToPlaylist = () => emit('add-to-playlist', props.track);
const handleRemove = () => emit('remove', props.track);
const handlePlay = () => emit('play', props.track);

const trackColor = computed(() => props.track.color || 'transparent');
const pictureUrlCacheStore = usePictureUrlCacheStore();

const albumArtStyle = computed(() => {
  if (props.track.picture) {
    return pictureUrlCacheStore.getPictureStyle(props.track.picture);
  }
  return {};
});
</script>
<template>
  <QItem
    class="track-item"
    :class="{ 'is-selected': isSelected, 'is-playing': isPlaying }"
    :style="{ '--track-item-color': trackColor }"
    @click="handlePlay"
    v-bind="draggable ? { 'data-draggable': true } : {}"
  >
    <QItemSection>
      <TrackInfo :artwork-size="'60px'" :track="track" :show-artwork="true" />
    </QItemSection>
    <QItemSection>
      <div class="track-duration">
        {{ track.duration ? formatTime(track.duration) : '' }}
      </div>
    </QItemSection>
    <QItemSection>
      <div class="track-actions">
        <QBtn flat @click.stop="handleAddToPlaylist"><IconPlus /></QBtn>
        <QBtn flat @click.stop="handleRemove"><IconX /></QBtn>
      </div>
    </QItemSection>
  </QItem>
</template>

<style scoped>
.track-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  position: relative;
  overflow: hidden;
}
.track-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--track-item-color, transparent);
  transition: width 0.2s;
}
.track-item:hover::before,
.track-item.is-selected::before {
  width: 8px;
}
.track-item:hover {
  box-shadow: var(--shadow-sm);
}
.track-artwork {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background-size: cover;
  background-position: center;
  margin-right: 1rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-lighter);
  font-size: 24px;
}
.track-artwork-placeholder {
  background-color: var(--color-background-mute);
}
.track-info {
  flex-grow: 1;
  min-width: 0;
}
.track-title {
  font-weight: 500;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-artist {
  font-size: 0.9em;
  color: var(--color-text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.track-duration {
  margin-left: 1rem;
  color: var(--color-text-light);
  font-size: 0.95em;
  min-width: 3em;
  text-align: right;
}
.track-actions {
  gap: 0.5rem;
  margin-left: 1rem;
  display: none;
  align-items: center;
}

.track-item:hover .track-actions {
  display: flex;
}

.track-item.is-selected {
  background-color: var(--color-info-light);
}
</style>
