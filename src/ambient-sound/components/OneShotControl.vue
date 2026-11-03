<template>
  <div
    class="one-shot-control"
    :class="{ 'is-playing': playing }"
    role="button"
    tabindex="0"
    :aria-label="oneShot.name"
    @click="play"
    @keydown.enter.prevent="play"
    @keydown.space.prevent="play"
  >
    <QKnob
      v-model="progress"
      :min="0"
      :max="100"
      :thickness="0.2"
      :size="`${knobSize}px`"
      :color="playing ? 'primary' : 'grey-7'"
      track-color="grey-4"
      show-value
      readonly
      :instant-feedback="true"
      :no-pointer-events="true"
      class="one-shot-knob"
    >
      <AmbientIcon :icon="oneShot.icon" :size="iconSize" />
    </QKnob>

    <div class="text-subtitle2 text-weight-medium text-center">
      {{ oneShot.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { OneShotDef } from '@/ambient-sound/types';

const props = withDefaults(
  defineProps<{
    packId: string;
    oneShot: OneShotDef;
    knobSize?: number;
  }>(),
  { knobSize: 76 },
);

const store = useAmbientSoundStore();
const progress = ref(0);

const playing = computed(() =>
  store.isOneShotPlaying(props.packId, props.oneShot.id),
);
const iconSize = computed(() => Math.round(props.knobSize * 0.34));

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
  if (!playing.value) {
    progress.value = 0;
    frame = null;
    return;
  }
  progress.value = Math.round(
    store.oneShotProgress(props.packId, props.oneShot.id) * 100,
  );
  frame = raf(tick);
}

watch(
  playing,
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

function play() {
  void store.playOneShot(props.packId, props.oneShot.id);
}

onUnmounted(() => {
  if (frame !== null) cancelRaf(frame);
  frame = null;
});
</script>

<style scoped>
.one-shot-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.25rem;
  min-width: 0;
  cursor: pointer;
  outline: none;
}

.one-shot-control:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: var(--border-radius);
}

.one-shot-knob {
  pointer-events: none;
  transition: color 0.2s ease;
}
</style>
