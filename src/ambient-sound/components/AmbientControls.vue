<template>
  <div class="ambient-controls">
    <QToolbar class="q-pa-none intensity-bar">
      <div class="intensity-label text-caption text-grey-7">
        {{ t('ambientSoundPage.intensity') }}
      </div>
      <div
        class="intensity-slider"
        @mouseenter="isIntensityHovered = true"
        @mouseleave="isIntensityHovered = false"
      >
        <QSlider
          :model-value="store.intensity / 100"
          :min="0"
          :max="1"
          :step="0.25"
          snap
          :markers="true"
          :color="isIntensityHovered ? 'info' : 'primary'"
          :track-size="isIntensityHovered ? '10px' : '5px'"
          :aria-label="t('ambientSoundPage.intensity')"
          @update:model-value="
            (value: number | null) =>
              value !== null && store.setIntensity(Math.round(value * 100))
          "
        />
      </div>
      <div class="intensity-value text-caption text-grey-7">
        {{ store.intensity }}%
      </div>
    </QToolbar>

    <div class="ambient-control-row">
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
              :aria-label="t('ambientSoundPage.masterVolume')"
              @update:model-value="
                (value: number | null) =>
                  value !== null && store.setMasterVolume(value * 100)
              "
            />
            <span class="volume-popup-value">{{ store.masterVolume }}%</span>
          </div>
        </QPopupProxy>
      </QBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const { t } = useI18n();
const store = useAmbientSoundStore();

const isVolumePopupOpen = ref(false);
const isVolumeHovered = ref(false);
const isIntensityHovered = ref(false);
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
.ambient-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.intensity-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.intensity-slider {
  flex: 1 1 auto;
}

.intensity-slider :deep(.q-slider__markers) {
  color: var(--color-text-light);
  opacity: 0.9;
}

.intensity-label {
  min-width: 68px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.intensity-value {
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ambient-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
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
