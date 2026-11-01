<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconArrowBarToDown,
  IconArrowBarToUp,
  IconDotsVertical,
  IconPlaylistAdd,
  IconTrash,
} from '@tabler/icons-vue';

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
  (e: 'play-next', track: JukeboxTrack): void;
  (e: 'play-last', track: JukeboxTrack): void;
}>();

const { t } = useI18n();
const isMenuOpen = ref(false);

const handleAddToPlaylist = () => {
  emit('add-to-playlist', props.track);
  isMenuOpen.value = false;
};
const handleRemove = () => {
  emit('remove', props.track);
  isMenuOpen.value = false;
};
const handlePlayNext = () => {
  emit('play-next', props.track);
  isMenuOpen.value = false;
};
const handlePlayLast = () => {
  emit('play-last', props.track);
  isMenuOpen.value = false;
};
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
      <TrackInfo
        :artwork-size="'60px'"
        :track="track"
        :show-artwork="true"
        horizontal
      />
    </QItemSection>
    <QItemSection side>
      {{ track.duration ? formatTime(track.duration) : '' }}
    </QItemSection>
    <QItemSection side class="track-actions">
      <QBtn
        flat
        dense
        round
        class="track-menu-trigger"
        :title="t('common.actions')"
        :aria-label="t('common.actions')"
        @click.stop
      >
        <IconDotsVertical />
        <QPopupProxy
          v-model="isMenuOpen"
          anchor="bottom right"
          self="top right"
          :breakpoint="0"
        >
          <QList dense class="track-actions-menu">
            <QItem clickable @click.stop="handleAddToPlaylist">
              <QItemSection side>
                <IconPlaylistAdd />
              </QItemSection>
              <QItemSection>{{ t('common.addToPlaylist') }}</QItemSection>
            </QItem>
            <QItem clickable @click.stop="handlePlayNext">
              <QItemSection side>
                <IconArrowBarToDown />
              </QItemSection>
              <QItemSection>{{ t('jukebox.playNext') }}</QItemSection>
            </QItem>
            <QItem clickable @click.stop="handlePlayLast">
              <QItemSection side>
                <IconArrowBarToUp />
              </QItemSection>
              <QItemSection>{{ t('jukebox.playLast') }}</QItemSection>
            </QItem>
            <QItem clickable @click.stop="handleRemove">
              <QItemSection side>
                <IconTrash />
              </QItemSection>
              <QItemSection>{{ t('common.remove') }}</QItemSection>
            </QItem>
          </QList>
        </QPopupProxy>
      </QBtn>
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

.track-actions-menu {
  min-width: 200px;
}

.track-item.is-selected {
  background-color: var(--color-info-light);
}
</style>
