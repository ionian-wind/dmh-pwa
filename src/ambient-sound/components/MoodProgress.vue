<template>
  <ProgressIndicator :state="progressState" :percent="progress">
    {{ label }}
  </ProgressIndicator>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import ProgressIndicator from '@/components/common/ProgressIndicator.vue';

const props = withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
  }>(),
  { active: false },
);

const store = useAmbientSoundStore();
const progress = ref(0);

const shouldTrack = computed(() => props.active && store.isPlaying);
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
