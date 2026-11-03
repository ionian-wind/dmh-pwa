<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useJukeboxPlayerStore } from '@/jukebox/playerStore';
import TrackInfo from '@/jukebox/components/TrackInfo.vue';
import {
  getGradientContrastColor,
  useAnimatedGradient,
} from '@/jukebox/useAnimatedGradient';
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
  IconSettingsAutomation,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-vue';
import { useConfigStore } from '@/utils/configStore';
const props = defineProps<{
  animatedBackground?: boolean;
  showArtwork?: boolean;
  modal?: boolean;
}>();
const { t } = useI18n();
const playerStore = useJukeboxPlayerStore();
const configStore = useConfigStore();

const palette = computed<string[] | undefined>(() => {
  const track = playerStore.currentTrack;
  if (track?.palette && track.palette.length > 0) return track.palette;
  if (track?.color) return [track.color, track.color, track.color];
  return undefined;
});

const hasGradientBg = computed(
  () =>
    !!props.animatedBackground &&
    configStore.jukeboxAnimatePlayerBackground &&
    !!palette.value?.length,
);

const isAnimatedBg = computed(
  () => hasGradientBg.value && playerStore.isPlaying,
);

const gradientStyle = useAnimatedGradient(hasGradientBg, () => palette.value);
const gradientKey = computed(() => palette.value?.join('|') ?? '');
const gradientVisible = ref(false);

watch(
  hasGradientBg,
  (visible) => {
    if (visible) gradientVisible.value = true;
  },
  { immediate: true },
);

function onGradientAfterLeave() {
  if (!hasGradientBg.value) gradientVisible.value = false;
}

// Keep controls readable over the gradient, static or animated.
const controlStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {};
  if (!hasGradientBg.value || !palette.value?.length) {
    return style;
  }
  const color = getGradientContrastColor(palette.value);
  style['--jp-control-color'] = color;
  style['--jp-control-track'] = `${color}33`;
  return style;
});

// Volume popup open state
const isVolumePopupOpen = ref(false);
const isVolumeHovered = ref(false);
const isVolumePopupDragging = ref(false);
const isSettingsPopupOpen = ref(false);

let closeTimeout: ReturnType<typeof setTimeout> | null = null;

function onVolumePointerDown() {
  isVolumePopupDragging.value = true;
  document.addEventListener(
    'pointerup',
    () => {
      isVolumePopupDragging.value = false;
    },
    { once: true },
  );
}

function onVolumeEnter() {
  if (closeTimeout) {
    clearTimeout(closeTimeout);
    closeTimeout = null;
  }
  isVolumePopupOpen.value = true;
}

function onVolumeLeave() {
  if (isVolumePopupDragging.value) return;
  closeTimeout = setTimeout(() => {
    isVolumePopupOpen.value = false;
  }, 200);
}

function handleVolumeWheel(event: WheelEvent) {
  event.preventDefault();
  isVolumePopupOpen.value = true;
  const delta = event.deltaY;
  let newVolume = playerStore.volume - delta * 0.001;
  newVolume = Math.max(0, Math.min(1, newVolume));
  playerStore.setVolume(newVolume);
}

function setSmoothTrackChange(value: boolean) {
  configStore.jukeboxSmoothTrackChange = value;
}

function setAnimatePlayerBackground(value: boolean) {
  configStore.jukeboxAnimatePlayerBackground = value;
}

function setDisplayCoverWhilePlaying(value: boolean) {
  configStore.jukeboxDisplayCoverWhilePlaying = value;
}

function setUseMiniPlayer(value: boolean) {
  configStore.jukeboxUseMiniPlayer = value;
}

const displayArtwork = computed(
  () => props.showArtwork && configStore.jukeboxDisplayCoverWhilePlaying,
);

// Theming logic: update CSS variables for JukeboxPlayer based on track color
const showRemainingTime = ref(false);
function toggleTimeDisplay() {
  showRemainingTime.value = !showRemainingTime.value;
}

const progress = computed(() => playerStore.currentTime / playerStore.duration);
const volumePercent = computed(
  () => `${Math.round(playerStore.volume * 100)}%`,
);

// Add hover state for progress bar
const isProgressHovered = ref(false);

// Handle progress change from slider
const handleProgressChange = (value: number | null) => {
  if (value === null) return;
  const duration = playerStore.duration || 1;
  const time = value * duration;
  playerStore.seek(time);
};
</script>

<template>
  <div
    :class="{
      'jukebox-player-modal': props.modal,
      'jukebox-player': true,
      'animated-gradient-surface': true,
      'has-gradient-bg': gradientVisible,
      'with-animated-bg': isAnimatedBg,
    }"
    :style="controlStyle"
  >
    <Transition
      name="jukebox-gradient-fade"
      @after-leave="onGradientAfterLeave"
    >
      <div
        v-if="hasGradientBg"
        :key="gradientKey"
        class="animated-gradient-layer"
        aria-hidden="true"
        :style="gradientStyle"
      />
    </Transition>
    <TrackInfo
      :track="playerStore.currentTrack"
      :show-artwork="displayArtwork"
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
        <QSlider
          :model-value="progress"
          :min="0"
          :disable="playerStore.currentTrack === null"
          :max="1"
          :step="0.001"
          :label="false"
          :markers="false"
          :track-size="isProgressHovered ? '10px' : '5px'"
          @update:model-value="
            (value) => value !== null && handleProgressChange(value)
          "
        />
      </div>
      <div class="progress-bar-time time-duration">
        {{ formatTime(playerStore.duration) }}
      </div>
    </QToolbar>

    <QToolbar class="q-pa-none q-gutter-x-sm player-controls">
      <QBtnGroup flat class="playback-options">
        <QBtn
          flat
          :class="{ 'is-inactive': !playerStore.shuffle }"
          :disable="!playerStore.currentTrack"
          @click="playerStore.toggleShuffle"
          :title="t('jukebox.shuffle')"
        >
          <IconShuffle />
        </QBtn>
        <QBtn
          flat
          :class="{
            'is-inactive':
              playerStore.repeatMode !== 'list' &&
              playerStore.repeatMode !== 'track',
          }"
          :disable="!playerStore.currentTrack"
          @click="playerStore.cycleRepeatMode"
          :title="t('jukebox.repeat')"
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
          :disabled="!(playerStore.currentTrack && playerStore.hasPrevTrack)"
          class="prev-track"
        >
          <IconPlayerSkipBack />
        </QBtn>
        <QBtn
          flat
          @click="playerStore.togglePlay()"
          :disabled="!(playerStore.currentTrack && playerStore.canPlay)"
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
          :title="`${t('jukebox.volume')}: ${volumePercent}`"
          :aria-label="`${t('jukebox.volume')}: ${volumePercent}`"
          @mouseenter="onVolumeEnter"
          @mouseleave="onVolumeLeave"
        >
          <IconVolume v-if="playerStore.volume > 0" />
          <IconVolumeOff v-else />
          <QPopupProxy
            v-model="isVolumePopupOpen"
            anchor="center left"
            self="center right"
            :breakpoint="0"
            no-parent-event
          >
            <div
              class="volume-popup q-pa-sm"
              style="width: 200px"
              @wheel.prevent="handleVolumeWheel"
              @pointerdown="onVolumePointerDown"
              @mouseenter="
                onVolumeEnter();
                isVolumeHovered = true;
              "
              @mouseleave="
                onVolumeLeave();
                isVolumeHovered = false;
              "
            >
              <QSlider
                :model-value="playerStore.volume"
                :min="0"
                :max="1"
                :step="0.01"
                :markers="false"
                :track-size="isVolumeHovered ? '10px' : '5px'"
                size="md"
                class="volume-bar"
                @update:model-value="
                  (value) => value !== null && playerStore.setVolume(value)
                "
              />
              <span class="volume-popup-value">{{ volumePercent }}</span>
            </div>
          </QPopupProxy>
        </QBtn>

        <QBtn
          flat
          class="settings-button"
          :title="t('jukebox.playerSettings')"
          :aria-label="t('jukebox.playerSettings')"
        >
          <IconSettingsAutomation />
          <QPopupProxy
            v-model="isSettingsPopupOpen"
            anchor="bottom right"
            self="top right"
            :breakpoint="0"
          >
            <div class="player-settings q-pa-sm">
              <div class="player-settings-title">
                {{ t('jukebox.playerSettings') }}
              </div>
              <div class="player-settings-row">
                <span class="player-settings-label">
                  {{ t('jukebox.smoothTrackChange') }}
                </span>
                <QToggle
                  :model-value="configStore.jukeboxSmoothTrackChange"
                  @update:model-value="setSmoothTrackChange"
                />
              </div>
              <div class="player-settings-row">
                <span class="player-settings-label">
                  {{ t('jukebox.animatePlayerBackground') }}
                </span>
                <QToggle
                  :model-value="configStore.jukeboxAnimatePlayerBackground"
                  @update:model-value="setAnimatePlayerBackground"
                />
              </div>
              <div class="player-settings-row">
                <span class="player-settings-label">
                  {{ t('jukebox.displayCoverWhilePlaying') }}
                </span>
                <QToggle
                  :model-value="configStore.jukeboxDisplayCoverWhilePlaying"
                  @update:model-value="setDisplayCoverWhilePlaying"
                />
              </div>
              <div class="player-settings-row">
                <span class="player-settings-label">
                  {{ t('jukebox.useMiniPlayer') }}
                </span>
                <QToggle
                  :model-value="configStore.jukeboxUseMiniPlayer"
                  @update:model-value="setUseMiniPlayer"
                />
              </div>
            </div>
          </QPopupProxy>
        </QBtn>
      </QBtnGroup>
    </QToolbar>
  </div>
</template>

<style scoped>
.jukebox-player {
  color: var(--jp-control-color, var(--color-text));
}

.jukebox-player:not(.jukebox-player-modal) {
  padding-top: 1rem;
}

.jukebox-player :deep(.q-slider),
.jukebox-player :deep(.q-slider__track),
.jukebox-player :deep(.q-slider__thumb) {
  color: var(--jp-control-color, var(--color-text));
}

.jukebox-player :deep(.q-slider__track),
.jukebox-player :deep(.q-slider__inner) {
  background: var(--jp-control-track, rgba(0, 0, 0, 0.12));
}

.playback-options .is-inactive {
  opacity: 0.55;
}

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

.player-controls {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  column-gap: 8px;
}

.playback-options {
  grid-column: 1;
  justify-self: start;
}

.playback-controls {
  grid-column: 2;
  justify-self: center;
}

.volume-control {
  grid-column: 3;
  justify-self: end;
}

.progress-bar-time.time-current,
.progress-bar-seek,
.playback-options {
  cursor: pointer !important;
}

.jukebox-player-modal .player-controls .playback-controls {
  grid-column: 2;
  order: initial;
}

/* QSlider customizations */
.progress-bar-seek .q-slider {
  width: 100%;
}

.volume-bar.q-slider {
  width: 100%;
}

/* Fix volume popup scrollbar issue */
.volume-popup {
  overflow: hidden;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
}

.volume-popup-value {
  min-width: 38px;
  text-align: right;
  font-size: 0.75rem;
  color: var(--color-text-light);
  font-variant-numeric: tabular-nums;
}

.player-settings {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 240px;
}

.player-settings-title {
  font-weight: 600;
}

.player-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.player-settings-label {
  white-space: nowrap;
}

.volume-popup .q-slider {
  overflow: visible;
  width: 100%;
}

.volume-popup .q-slider__track-container {
  overflow: visible;
}

.volume-popup .q-slider__thumb {
  overflow: visible;
}
</style>
