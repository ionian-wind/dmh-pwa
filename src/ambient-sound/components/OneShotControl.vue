<template>
  <div class="one-shot-control" :class="{ 'is-playing': playing }">
    <QKnob
      :model-value="progress"
      :min="0"
      :max="100"
      :thickness="0.2"
      :size="`${knobSize}px`"
      :color="playing ? 'primary' : 'grey-7'"
      track-color="grey-4"
      show-value
      readonly
      class="one-shot-knob"
      role="button"
      tabindex="0"
      :aria-label="oneShot.name"
      @click="play"
      @keydown.enter.prevent="play"
      @keydown.space.prevent="play"
    >
      <AmbientIcon :icon="oneShot.icon" :size="iconSize" />
    </QKnob>

    <div class="text-subtitle2 text-weight-medium text-center">
      {{ oneShot.name }}
    </div>
    <div v-if="packName" class="text-caption text-grey-7 text-center">
      {{ packName }} · {{ oneShot.category }}
    </div>
    <div
      v-if="usedIn !== undefined"
      class="text-caption text-grey-6 text-center"
    >
      {{ usedIn }} {{ t('ambientSoundPage.scenes') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AmbientIcon from '@/ambient-sound/components/AmbientIcon.vue';
import { useAmbientSoundStore } from '@/ambient-sound/stores/ambientSoundStore';
import type { OneShotDef } from '@/ambient-sound/types';

const props = withDefaults(
  defineProps<{
    packId: string;
    oneShot: OneShotDef;
    packName?: string;
    usedIn?: number;
    knobSize?: number;
  }>(),
  { packName: '', usedIn: undefined, knobSize: 76 },
);

const { t } = useI18n();
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
}

.one-shot-knob {
  cursor: pointer;
  transition: color 0.2s ease;
  outline: none;
}

.one-shot-knob:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: 50%;
}
</style>
