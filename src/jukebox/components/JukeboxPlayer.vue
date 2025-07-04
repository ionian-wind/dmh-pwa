<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import TrackInfo from '@/jukebox/components/TrackInfo.vue';
import { useAnimatedGradient } from '@/jukebox/useAnimatedGradient';
import { formatTime } from '@/jukebox/utils';

// Tabler icons
import {
  IconPlayerSkipBack,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipForward,
  IconArrowsShuffle as IconShuffle,
  IconRepeat,
  IconRepeatOnce,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-vue';

const props = defineProps<{
  animatedBackground?: boolean;
  showArtwork?: boolean;
  modal?: boolean;
}>();
const playerStore = useJukeboxPlayerStore();

const showAnimatedBg = computed(
  () => !!props.animatedBackground && playerStore.isPlaying,
);

// Use the new composable for the gradient style
const gradientStyle = useAnimatedGradient(
  () => !!props.animatedBackground && playerStore.isPlaying,
  () => {
    const track = playerStore.currentTrack;
    if (track?.palette && track.palette.length > 0) {
      return track.palette;
    } else if (track?.color) {
      // Use a simple palette based on the single color
      // Approach: create a gradient with the color at different stops and alpha
      // Example: [color, color with more alpha, ...]
      // We'll use the color at 0% and 100%, and a lighter version at 50%
      // For simplicity, just repeat the color
      return [track.color, track.color, track.color];
    }
    return undefined;
  },
);

// Volume popup open state
const isVolumePopupOpen = ref(false);

function handleVolumeBarClick(event: MouseEvent) {
  const bar = event.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const percent = Math.min(Math.max(x / rect.width, 0), 1);
  playerStore.setVolume(percent);
}

function handleVolumeBarDrag(event: MouseEvent) {
  if (event.buttons !== 1) return;
  handleVolumeBarClick(event);
}

function handleVolumeWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY;
  let newVolume = playerStore.volume - delta * 0.001;
  newVolume = Math.max(0, Math.min(1, newVolume));
  playerStore.setVolume(newVolume);
}

// Theming logic: update CSS variables for JukeboxPlayer based on track color
const defaultTheme = {
  '--jp-color-primary': 'var(--color-primary)',
  '--jp-color-background-soft': 'var(--color-background)',
  '--jp-color-primary-dark': 'var(--color-primary-dark)',
  '--jp-color-primary-light': 'var(--color-text-light)',
  '--jp-color-background': 'var(--color-background)',
  '--jp-color-text': 'var(--color-text)',
};

function getContrastColor(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  // Parse r, g, b
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return dark for light colors, light for dark colors
  return luminance > 0.6 ? '#1e1e2e' : '#fff';
}

function setJukeboxTheme(color?: string) {
  const el = document.querySelector('.jukebox-player') as HTMLElement | null;
  if (!el) return;
  if (color) {
    const contrast = getContrastColor(color);
    el.style.setProperty('--track-color', contrast + 'cc');
    el.style.setProperty('--track-fill-color', getContrastColor(contrast));

    el.style.setProperty('--jp-color-primary', contrast + 'cc');
    el.style.setProperty('--jp-color-primary-dark', contrast);
    el.style.setProperty('--jp-color-primary-light', contrast + 'cc');
    el.style.setProperty('--jp-color-text', '#333');
  } else {
    Object.entries(defaultTheme).forEach(([key, value]) => {
      el.style.setProperty(key, value);
    });
  }
}

watchEffect(() => {
  const color = playerStore.currentTrack?.color;
  setTimeout(() => setJukeboxTheme(color), 0); // next tick to ensure DOM is ready
});

const showRemainingTime = ref(false);
function toggleTimeDisplay() {
  showRemainingTime.value = !showRemainingTime.value;
}

const progress = computed(() => playerStore.currentTime / playerStore.duration);

// Add hover state for progress bar
const isProgressHovered = ref(false);

// Log and seek to potential progress value on click
function seekToPotentialProgressValue(event: MouseEvent) {
  const bar = event.currentTarget as HTMLElement;
  const rect = bar.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const percent = Math.min(Math.max(x / rect.width, 0), 1);
  const duration = playerStore.duration || 1;
  const time = percent * duration;

  playerStore.seek(time);
}
</script>

<template>
  <div
    :class="{
      'jukebox-player-modal': props.modal,
      'jukebox-player': true,
      'with-animated-bg': showAnimatedBg,
    }"
    :style="gradientStyle"
  >
    <TrackInfo
      :track="playerStore.currentTrack"
      :show-artwork="props.showArtwork"
    />

    <QToolbar class="q-pa-none q-gutter-x-sm progress-bar">
      <div class="progress-bar-time time-current" @click="toggleTimeDisplay">
        <template v-if="!showRemainingTime">
          {{ formatTime(playerStore.currentTime) }}
        </template>
        <template v-else>
          -{{
            formatTime((playerStore.duration || 0) - playerStore.currentTime)
          }}
        </template>
      </div>
      <div
        class="progress-bar-seek"
        @mouseenter="isProgressHovered = true"
        @mouseleave="isProgressHovered = false"
      >
        <QLinearProgress
          :size="isProgressHovered ? 'lg' : 'sm'"
          :value="progress"
          color="info"
          :instant-feedback="true"
          class="progress-bar-transition"
          @click="seekToPotentialProgressValue"
        />
      </div>
      <div class="progress-bar-time time-duration">
        {{ formatTime(playerStore.duration) }}
      </div>
    </QToolbar>

    <QToolbar class="q-pa-none q-gutter-x-sm justify-between player-controls">
      <QBtnGroup flat class="playback-options">
        <QBtn
          flat
          :class="{ disabled: !playerStore.shuffle }"
          @click="playerStore.toggleShuffle"
          title="Shuffle"
        >
          <IconShuffle />
        </QBtn>
        <QBtn
          flat
          :class="{
            disabled:
              playerStore.repeatMode !== 'list' &&
              playerStore.repeatMode !== 'track',
          }"
          @click="playerStore.cycleRepeatMode"
          title="Repeat"
        >
          <IconRepeat v-if="playerStore.repeatMode === 'off'" />
          <IconRepeat v-else-if="playerStore.repeatMode === 'list'" />
          <IconRepeatOnce v-else />
        </QBtn>
      </QBtnGroup>

      <QBtnGroup flat class="playback-controls">
        <QBtn
          flat
          @click="playerStore.playPrev()"
          :disabled="!playerStore.hasPrevTrack"
          class="prev-track"
        >
          <IconPlayerSkipBack />
        </QBtn>
        <QBtn
          flat
          @click="playerStore.togglePlay()"
          :disabled="!playerStore.canPlay"
          class="play-pause"
        >
          <IconPlayerPause v-if="playerStore.isPlaying" />
          <IconPlayerPlay v-else />
        </QBtn>
        <QBtn
          flat
          @click="playerStore.playNext()"
          :disabled="!playerStore.currentTrack || !playerStore.hasNextTrack"
          class="next-track"
        >
          <IconPlayerSkipForward />
        </QBtn>
      </QBtnGroup>

      <QBtnGroup flat class="volume-control">
        <QBtn
          flat
          @click="playerStore.toggleMute()"
          @wheel.prevent="handleVolumeWheel"
          class="volume-button"
          @mouseenter="isVolumePopupOpen = true"
          @mouseleave="isVolumePopupOpen = false"
        >
          <IconVolume v-if="playerStore.volume > 0" />
          <IconVolumeOff v-else />
          <QPopupProxy
            v-model="isVolumePopupOpen"
            transition-show="jump-left"
            transition-hide="jump-right"
            anchor="center left"
            self="center right"
            :breakpoint="0"
            @mouseleave="isVolumePopupOpen = false"
            @mouseenter="isVolumePopupOpen = true"
          >
            <div
              class="volume-popup q-pa-sm"
              style="width: 120px"
              @wheel.prevent="handleVolumeWheel"
            >
              <QLinearProgress
                :instant-feedback="true"
                :value="playerStore.volume"
                color="info"
                size="md"
                class="volume-bar"
                @click="handleVolumeBarClick"
                @mousemove="handleVolumeBarDrag"
              />
            </div>
          </QPopupProxy>
        </QBtn>
      </QBtnGroup>
    </QToolbar>
  </div>
</template>

<style scoped>
.progress-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}
.progress-bar-seek {
  flex: 1 1 auto;
}
.progress-bar-time {
  min-width: 48px;
  text-align: center;
}

.progress-bar-time.time-current,
.progress-bar-seek,
.playback-options .q-btn.disabled {
  cursor: pointer !important;
}

.jukebox-player-modal .player-controls .playback-controls {
  order: -1;
}
</style>
