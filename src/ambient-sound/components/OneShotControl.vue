<template>
  <QBtn
    no-caps
    padding="sm none"
    class="one-shot-control"
    :class="{ 'is-playing': playing }"
    :aria-label="oneShot.name"
    :aria-pressed="playing ? 'true' : 'false'"
    @click="play"
  >
    <span class="one-shot-content">
      <span class="one-shot-knob-wrap">
        <QKnob
          v-model="progress"
          :min="0"
          :max="100"
          :thickness="0.2"
          :size="`${knobSize}px`"
          :color="playing ? 'primary' : 'transparent'"
          :track-color="playing ? 'grey-4' : 'transparent'"
          show-value
          readonly
          :instant-feedback="true"
          :no-pointer-events="true"
          class="one-shot-knob"
        >
          <AmbientIcon :icon="oneShot.icon" :size="iconSize" />
        </QKnob>
        <QBadge v-if="playCount > 1" color="primary" class="one-shot-count">
          ×{{ playCount }}
        </QBadge>
      </span>

      <span class="text-subtitle2 text-weight-medium text-center">
        {{ oneShot.name }}
      </span>
    </span>
  </QBtn>
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
const playCount = computed(() =>
  store.oneShotPlayCount(props.packId, props.oneShot.id),
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
  width: 100%;
  min-width: 0;
}

.one-shot-control.is-playing {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}

.one-shot-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.25rem;
  min-width: 0;
}

.one-shot-knob-wrap {
  position: relative;
  display: flex;
}

.one-shot-knob {
  pointer-events: none;
  transition: color 0.2s ease;
}

.one-shot-count {
  position: absolute;
  top: -2px;
  right: -4px;
  pointer-events: none;
}
</style>
