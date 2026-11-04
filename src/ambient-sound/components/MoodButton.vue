<template>
  <QBtn
    v-if="!trackProgress"
    class="mood-button"
    :class="{ 'is-active': active }"
    :label="label"
    :disable="disabled"
    :color="active ? 'primary' : 'grey-7'"
    :outline="!active"
    no-caps
    size="lg"
    :aria-pressed="active"
    @click="select"
  />
  <ProgressButton
    v-else
    class="mood-button"
    :class="{ 'is-active': active }"
    :state="progressState"
    :percent="progress"
    :disable="disabled"
    :color="active ? 'primary' : 'grey-7'"
    :outline="!active"
    no-caps
    size="lg"
    :title="label"
    :aria-label="label"
    :aria-pressed="active"
    @click="select"
  >
    {{ label }}
  </ProgressButton>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import ProgressButton from '@/components/common/ProgressButton.vue';

const props = withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    disabled?: boolean;
    /** Track playback progress (used for temporary presets). */
    trackProgress?: boolean;
  }>(),
  {
    active: false,
    disabled: false,
    trackProgress: false,
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

const progressState = computed(() => (shouldTrack.value ? 'playing' : 'none'));

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
