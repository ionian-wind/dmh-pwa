<template>
  <QBtn
    flat
    class="volume-button"
    :title="`${label}: ${volumePercent}%`"
    :aria-label="`${label}: ${volumePercent}%`"
    @click="handleClick"
    @wheel.prevent="handleVolumeWheel"
    @mouseenter="onVolumeEnter"
    @mouseleave="onVolumeLeave"
  >
    <QIcon name="tabler-volume" v-if="modelValue > 0" />
    <QIcon name="tabler-volume-off" v-else />
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
          :model-value="modelValue"
          :min="0"
          :max="1"
          :step="0.01"
          :markers="false"
          :color="isVolumeHovered ? 'info' : 'primary'"
          :track-size="isVolumeHovered ? '10px' : '5px'"
          size="md"
          class="volume-bar"
          :aria-label="label"
          @update:model-value="
            (value: number | null) =>
              value !== null && emit('update:modelValue', value)
          "
        />
        <span class="volume-popup-value">{{ volumePercent }}%</span>
      </div>
    </QPopupProxy>
  </QBtn>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    label: string;
    muteable?: boolean;
  }>(),
  { muteable: false },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
  (e: 'toggle-mute'): void;
}>();

const isVolumePopupOpen = ref(false);
const isVolumeHovered = ref(false);
const isVolumePopupDragging = ref(false);
let closeTimeout: ReturnType<typeof setTimeout> | null = null;

const volumePercent = computed(() => Math.round(props.modelValue * 100));

function handleClick() {
  if (props.muteable) emit('toggle-mute');
}

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
  const next = Math.max(
    0,
    Math.min(1, props.modelValue - event.deltaY * 0.001),
  );
  emit('update:modelValue', next);
}
</script>

<style scoped>
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
