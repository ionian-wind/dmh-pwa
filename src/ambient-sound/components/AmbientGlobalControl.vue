<template>
  <div class="ambient-player">
    <div class="ambient-player-header">
      <QAvatar rounded size="72px" class="ambient-artwork">
        <AmbientIcon :icon="store.activeScene?.scene.icon || '🎵'" :size="36" />
      </QAvatar>
      <div class="col">
        <div class="text-caption text-grey-7">
          {{ t('ambientSoundPage.nowPlaying') }}
        </div>
        <div class="text-h6">
          {{
            store.activeScene?.scene.name ||
            (store.hasActiveLayers
              ? t('ambientSoundPage.ambientMix')
              : t('ambientSoundPage.noScene'))
          }}
        </div>
        <div class="text-caption text-grey-7">
          {{
            store.activeScene?.pack.name ||
            (store.hasActiveLayers
              ? `${store.activeLayers.size} ${t('ambientSoundPage.ambiences').toLowerCase()}`
              : '')
          }}
        </div>
      </div>
      <div class="ambient-layer-count text-caption text-grey-6">
        {{ store.intensity }}%
        {{ t('ambientSoundPage.intensity') }}
      </div>
    </div>

    <QToolbar class="ambient-player-controls q-pa-none q-gutter-x-sm">
      <QBtnGroup flat class="playback-options">
        <QBtn
          flat
          :class="{ 'is-inactive': !store.musicEnabled }"
          :title="
            t(
              store.musicEnabled
                ? 'ambientSoundPage.musicOff'
                : 'ambientSoundPage.musicOn',
            )
          "
          :aria-label="
            t(
              store.musicEnabled
                ? 'ambientSoundPage.musicOff'
                : 'ambientSoundPage.musicOn',
            )
          "
          @click="store.toggleMusic()"
        >
          <IconMusic v-if="store.musicEnabled" />
          <IconMusicOff v-else />
        </QBtn>
      </QBtnGroup>

      <QBtnGroup flat class="playback-controls">
        <QBtn
          flat
          :disable="!store.activeScene && !store.hasActiveLayers"
          :title="t(store.isPlaying ? 'common.pause' : 'common.play')"
          :aria-label="t(store.isPlaying ? 'common.pause' : 'common.play')"
          @click="store.togglePlayPause()"
        >
          <IconPlayerPause v-if="store.isPlaying" />
          <IconPlayerPlay v-else />
        </QBtn>
        <QBtn
          flat
          :disable="!store.activeScene && !store.hasActiveLayers"
          :title="t('common.stop')"
          :aria-label="t('common.stop')"
          @click="store.stop()"
        >
          <IconPlayerStop />
        </QBtn>
      </QBtnGroup>

      <QBtnGroup flat class="volume-control">
        <QBtn
          flat
          :title="`${t('ambientSoundPage.masterVolume')}: ${store.masterVolume}%`"
          :aria-label="`${t('ambientSoundPage.masterVolume')}: ${store.masterVolume}%`"
          class="volume-button"
          @mouseenter="onVolumeEnter"
          @mouseleave="onVolumeLeave"
          @wheel.prevent="handleVolumeWheel"
        >
          <IconVolume v-if="store.masterVolume > 0" />
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
                :model-value="store.masterVolume / 100"
                :min="0"
                :max="1"
                :step="0.01"
                :markers="false"
                :color="isVolumeHovered ? 'info' : 'primary'"
                :track-size="isVolumeHovered ? '10px' : '5px'"
                size="md"
                class="volume-bar"
                @update:model-value="
                  (value: number | null) =>
                    value !== null && store.setMasterVolume(value * 100)
                "
              />
              <span class="volume-popup-value">{{ store.masterVolume }}%</span>
            </div>
          </QPopupProxy>
        </QBtn>
      </QBtnGroup>
    </QToolbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconMusic,
  IconMusicOff,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const { t } = useI18n();
const store = useAmbientSoundStore();

const isVolumePopupOpen = ref(false);
const isVolumeHovered = ref(false);
const isVolumePopupDragging = ref(false);
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
  const next = store.masterVolume - event.deltaY * 0.1;
  store.setMasterVolume(next);
}
</script>

<style scoped>
.ambient-player {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ambient-player-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ambient-artwork {
  background: var(--color-background-mute);
  color: var(--color-primary);
}

.ambient-layer-count {
  text-align: right;
  white-space: nowrap;
}

.ambient-player-controls {
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

.playback-options .is-inactive {
  opacity: 0.55;
}

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

.volume-popup .q-slider {
  overflow: visible;
  width: 100%;
}

.volume-popup .q-slider__track-container,
.volume-popup .q-slider__thumb {
  overflow: visible;
}
</style>
