<template>
  <span class="progress-indicator">
    <span
      v-if="renderedState !== 'none'"
      class="progress-indicator-icon"
      :class="{ 'is-finishing': isFinishing }"
    >
      <Transition name="progress-indicator-icon">
        <component :is="percentageIcon" :key="`percent-${percentageValue}`" />
      </Transition>
    </span>
    <slot />
  </span>
</template>

<script lang="ts">
export type ProgressIndicatorState = 'none' | 'playing';
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  IconPercentage0,
  IconPercentage10,
  IconPercentage100,
  IconPercentage20,
  IconPercentage25,
  IconPercentage30,
  IconPercentage33,
  IconPercentage40,
  IconPercentage50,
  IconPercentage60,
  IconPercentage66,
  IconPercentage70,
  IconPercentage75,
  IconPercentage80,
  IconPercentage90,
} from '@tabler/icons-vue';

const FADE_MS = 250;

const props = withDefaults(
  defineProps<{
    state?: ProgressIndicatorState;
    /** Progress from 0 to 100. */
    percent?: number;
  }>(),
  {
    state: 'none',
    percent: 0,
  },
);

const emit = defineEmits<{
  (e: 'update:state', value: ProgressIndicatorState): void;
  (e: 'finish'): void;
}>();

const PERCENTAGE_ICONS = [
  { value: 0, icon: IconPercentage0 },
  { value: 10, icon: IconPercentage10 },
  { value: 20, icon: IconPercentage20 },
  { value: 25, icon: IconPercentage25 },
  { value: 30, icon: IconPercentage30 },
  { value: 33, icon: IconPercentage33 },
  { value: 40, icon: IconPercentage40 },
  { value: 50, icon: IconPercentage50 },
  { value: 60, icon: IconPercentage60 },
  { value: 66, icon: IconPercentage66 },
  { value: 70, icon: IconPercentage70 },
  { value: 75, icon: IconPercentage75 },
  { value: 80, icon: IconPercentage80 },
  { value: 90, icon: IconPercentage90 },
  { value: 100, icon: IconPercentage100 },
];

const renderedState = ref<ProgressIndicatorState>(props.state);
const isFinishing = ref(false);
let finishTimer: ReturnType<typeof setTimeout> | null = null;

const clampedPercent = computed(() => {
  const value = Number(props.percent);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
});

const percentageEntry = computed(() =>
  PERCENTAGE_ICONS.reduce((closest, candidate) =>
    Math.abs(candidate.value - clampedPercent.value) <
    Math.abs(closest.value - clampedPercent.value)
      ? candidate
      : closest,
  ),
);

const percentageIcon = computed(() => percentageEntry.value.icon);
const percentageValue = computed(() => percentageEntry.value.value);

function clearFinishTimer() {
  if (finishTimer !== null) {
    clearTimeout(finishTimer);
    finishTimer = null;
  }
}

function cancelFinish() {
  clearFinishTimer();
  isFinishing.value = false;
}

function finishProgress() {
  if (isFinishing.value) return;
  isFinishing.value = true;
  finishTimer = setTimeout(() => {
    finishTimer = null;
    renderedState.value = 'none';
    isFinishing.value = false;
    emit('update:state', 'none');
    emit('finish');
  }, FADE_MS);
}

watch(
  [() => props.state, clampedPercent],
  ([state, percent]) => {
    cancelFinish();
    if (state !== 'playing') {
      renderedState.value = 'none';
      return;
    }
    renderedState.value = 'playing';
    if (percent >= 100) finishProgress();
  },
  { immediate: true },
);

onBeforeUnmount(clearFinishTimer);
</script>

<style scoped>
.progress-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
}

.progress-indicator-icon {
  position: relative;
  display: inline-flex;
  transition:
    opacity 250ms ease,
    transform 250ms ease;
}

.progress-indicator-icon svg {
  width: 1em;
  height: 1em;
}

.progress-indicator-icon.is-finishing {
  opacity: 0;
  transform: scale(0.8);
}

.progress-indicator-icon-enter-active,
.progress-indicator-icon-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.progress-indicator-icon-leave-active {
  position: absolute;
  inset: 0;
  margin: auto;
}

.progress-indicator-icon-enter-from,
.progress-indicator-icon-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
</style>
