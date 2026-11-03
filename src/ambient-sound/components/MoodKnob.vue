<template>
  <div
    class="mood-knob"
    :class="{ 'is-active': active, 'is-disabled': disabled }"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-label="label"
    :aria-disabled="disabled"
    @click="select"
    @keydown.enter.prevent="select"
    @keydown.space.prevent="select"
  >
    <QKnob
      v-model="progress"
      :min="0"
      :max="100"
      :thickness="0.18"
      :size="`${size}px`"
      :color="active ? 'primary' : 'grey-7'"
      track-color="grey-4"
      show-value
      readonly
      :instant-feedback="true"
      :no-pointer-events="true"
      :disable="disabled"
      class="mood-knob-control"
    >
      <span class="mood-knob-label">{{ label }}</span>
    </QKnob>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';

const props = withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    disabled?: boolean;
    /** Track and show playback progress (used for temporary presets). */
    trackProgress?: boolean;
    size?: number;
  }>(),
  {
    active: false,
    disabled: false,
    trackProgress: false,
    size: 68,
  },
);

const emit = defineEmits<{
  (e: 'select'): void;
}>();

const store = useAmbientSoundStore();
const progress = ref(0);

const shouldTrack = computed(
  () => props.trackProgress && props.active && store.isPlaying,
);

const raf =
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame.bind(globalThis)
    : (callback: FrameRequestCallback) =>
        setTimeout(() => callback(Date.now()), 80) as unknown as number;
const cancelRaf =
  typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame.bind(globalThis)
    : (handle: number) => clearTimeout(handle);

let frame: number | null = null;

function select() {
  if (!props.disabled) emit('select');
}

function tick() {
  if (!shouldTrack.value) {
    progress.value = 0;
    frame = null;
    return;
  }
  progress.value = Math.round(store.musicProgress() * 100);
  frame = raf(tick);
}

watch(
  shouldTrack,
  (value) => {
    if (value) {
      progress.value = 0;
      frame = raf(tick);
      return;
    }
    if (frame !== null) cancelRaf(frame);
    frame = null;
    progress.value = 0;
  },
  { immediate: true },
);

onUnmounted(() => {
  if (frame !== null) cancelRaf(frame);
  frame = null;
});
</script>

<style scoped>
.mood-knob {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  outline: none;
}

.mood-knob.is-disabled {
  cursor: default;
}

.mood-knob:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: var(--border-radius);
}

.mood-knob-control {
  pointer-events: none;
}

.mood-knob-label {
  max-width: 78%;
  overflow: hidden;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.1;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mood-knob.is-active .mood-knob-label {
  color: var(--color-primary);
}

.mood-knob.is-active .mood-knob-control {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 50%;
}
</style>
