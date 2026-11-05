<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconArrowBarToDown,
  IconArrowBarToUp,
  IconDotsVertical,
  IconGripVertical,
  IconPlaylistAdd,
  IconTrash,
} from '@tabler/icons-vue';

import type { JukeboxTrack } from '@/jukebox/types';

import { formatTime } from '../utils';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import { useJukeboxBulkSelection } from '@/jukebox/composables/useJukeboxBulkSelection';
import TrackInfo from './TrackInfo.vue';

const props = withDefaults(
  defineProps<{
    track: JukeboxTrack;
    isSelected?: boolean;
    isPlaying?: boolean;
    draggable?: boolean;
    selectable?: boolean;
    showRemove?: boolean;
  }>(),
  { showRemove: true, selectable: false },
);

const emit = defineEmits<{
  (e: 'add-to-playlist', track: JukeboxTrack): void;
  (e: 'remove', track: JukeboxTrack): void;
  (e: 'play', track: JukeboxTrack): void;
  (e: 'play-next', track: JukeboxTrack): void;
  (e: 'play-last', track: JukeboxTrack): void;
}>();

const { t } = useI18n();
const playerStore = useJukeboxPlayerStore();
const isMenuOpen = ref(false);
const { selectedTrackIds, hasSelectedPlaylists, toggleTrack } =
  useJukeboxBulkSelection();
const bulkSelected = computed(() => selectedTrackIds.value.has(props.track.id));
const bulkShiftClick = ref(false);
const waveformProgress = computed(() => {
  if (!props.isPlaying || playerStore.currentTrack?.id !== props.track.id) {
    return 0;
  }
  const duration = playerStore.duration || props.track.duration || 0;
  if (duration <= 0) return 0;
  return Math.min(1, Math.max(0, playerStore.currentTime / duration));
});
const playedWaveformStyle = computed(() => ({
  clipPath: `inset(0 ${(1 - waveformProgress.value) * 100}% 0 0)`,
}));

function captureBulkClick(event: MouseEvent) {
  bulkShiftClick.value = event.shiftKey;
}

function updateBulkSelection(selected: boolean) {
  toggleTrack(props.track.id, selected, bulkShiftClick.value);
  bulkShiftClick.value = false;
}

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
    :class="{
      'is-selected': isSelected,
      'is-playing': isPlaying,
      'is-disabled': track.disabled,
      'menu-open': isMenuOpen,
    }"
    :style="{ '--track-item-color': trackColor }"
    clickable
    @click="handlePlay"
    v-bind="draggable ? { 'data-draggable': true } : {}"
  >
    <QItemSection v-if="draggable" side class="track-drag-handle" @click.stop>
      <IconGripVertical :size="18" />
    </QItemSection>
    <QItemSection
      v-if="selectable"
      side
      class="track-bulk-select"
      @pointerdown.capture="captureBulkClick"
      @click.stop
    >
      <QCheckbox
        :model-value="bulkSelected"
        :disable="hasSelectedPlaylists"
        dense
        @update:model-value="updateBulkSelection"
      />
    </QItemSection>
    <QItemSection class="track-main">
      <div
        v-if="track.waveform"
        class="track-waveform"
        :class="{ 'track-waveform--visible': isPlaying }"
        aria-hidden="true"
      >
        <div
          class="track-waveform-layer track-waveform--base"
          v-html="track.waveform"
        />
        <div
          class="track-waveform-layer track-waveform--played"
          :style="playedWaveformStyle"
          v-html="track.waveform"
        />
      </div>
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
            <QItem
              v-if="showRemove !== false"
              clickable
              @click.stop="handleRemove"
            >
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
  position: relative;
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
.track-main {
  position: relative;
}

.track-waveform {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(60px + 20px);
  right: 12px;
  z-index: 0;
  color: var(--q-primary);
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  transform: scaleY(0);
  transform-origin: center;
  transition:
    transform 260ms ease,
    opacity 260ms ease;
}

.track-waveform--visible {
  opacity: 1;
  transform: scaleY(1);
}

.track-waveform-layer {
  position: absolute;
  inset: 0;
}

.track-main :deep(.track-info-row) {
  position: relative;
  z-index: 1;
}

.track-waveform--base {
  opacity: 0.16;
}

.track-waveform--played {
  opacity: 0.7;
}

.track-waveform-layer :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.track-waveform-layer :deep(path) {
  stroke: currentColor;
}

.track-item :deep(.q-item__section) {
  position: relative;
  z-index: 1;
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

.track-item.is-disabled {
  opacity: 0.55;
}

.track-drag-handle {
  cursor: grab;
  color: var(--color-text-lighter);
}

.track-drag-handle:active {
  cursor: grabbing;
}

.track-actions {
  display: none;
}

.track-item:hover .track-actions,
.track-item.menu-open .track-actions {
  display: flex;
}

.track-actions-menu {
  min-width: 200px;
}

.track-item.is-selected {
  background-color: var(--color-info-light);
}
</style>
