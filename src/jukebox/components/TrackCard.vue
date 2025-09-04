<script setup lang="ts">
import { computed } from 'vue';
import { IconPlus, IconX } from '@tabler/icons-vue';

import type { JukeboxTrack } from '@/jukebox/types';

import { formatTime } from '../utils';
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
</script>
<template>
  <QItem
    class="track-item"
    :class="{ 'is-selected': isSelected, 'is-playing': isPlaying }"
    :style="{ '--track-item-color': trackColor }"
    clickable
    @click="handlePlay"
    v-bind="draggable ? { 'data-draggable': true } : {}"
  >
    <QItemSection>
      <TrackInfo :artwork-size="'60px'" :track="track" :show-artwork="true" horizontal />
    </QItemSection>
    <QItemSection side>
      {{ track.duration ? formatTime(track.duration) : '' }}
    </QItemSection>
    <QItemSection side class="track-actions">
      <QBtnGroup flat>
        <QBtn flat @click.stop="handleAddToPlaylist"><IconPlus /></QBtn>
        <QBtn flat @click.stop="handleRemove"><IconX /></QBtn>  
      </QBtnGroup>
    </QItemSection>
  </QItem>
</template>

<style scoped>
.track-item {
  display: flex;
  /*align-items: center;*/
  /*padding: 0.75rem;*/
  margin-bottom: 0.5rem;
  border-radius: 8px;
  /*cursor: pointer;*/
  /*transition: all 0.2s;*/
  background: var(--color-background);
  border: 1px solid var(--color-border-light);
  /*position: relative;*/
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

.track-actions {
  display: none;
}

.track-item:hover .track-actions {
  display: flex;
}

.track-item.is-selected {
  background-color: var(--color-info-light);
}
</style>
