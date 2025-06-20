<template>
  <div class="range-slider-container" :class="{ 'is-disabled': disabled, 'is-vertical': vertical }">
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      class="slider"
      @input="onInput"
      :style="sliderStyle"
      :disabled="disabled"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  vertical?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  vertical: false,
});

const emit = defineEmits(['update:modelValue']);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', parseFloat(target.value));
}

const sliderProgress = computed(() => {
  const range = props.max - props.min;
  if (range === 0) return '0%';
  const progress = ((props.modelValue - props.min) / range) * 100;
  return `${progress}%`;
});

const sliderStyle = computed(() => ({
  '--progress': sliderProgress.value,
}));
</script>

<style scoped>
.range-slider-container {
  --track-height: 4px;
  --thumb-size: 12px;
  --thumb-border-width: 2px;
  --track-color: #e5e7eb;
  --track-fill-color: var(--primary-color, #4f46e5);
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  height: var(--thumb-size);
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: var(--track-height);
  background: linear-gradient(to right, var(--track-fill-color) var(--progress, 0%), var(--track-color) var(--progress, 0%));
  border-radius: var(--track-height);
  outline: none;
  cursor: pointer;
  transition: opacity .2s;
  padding: 0;
  margin: 0;
}

.is-disabled .slider {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Thumb */
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: var(--thumb-size);
  height: var(--thumb-size);
  background-color: var(--track-fill-color);
  border-radius: 50%;
  border: var(--thumb-border-width) solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  margin-top: calc(((var(--thumb-size) + var(--thumb-border-width) * 2) - var(--track-height)) / -2);
  transition: transform 0.2s ease;
}

.slider::-moz-range-thumb {
  width: var(--thumb-size);
  height: var(--thumb-size);
  background-color: var(--track-fill-color);
  border-radius: 50%;
  border: var(--thumb-border-width) solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

/* Hover/Active states */
.slider:not(:disabled):hover::-webkit-slider-thumb {
  transform: scale(1.1);
}
.slider:not(:disabled):hover::-moz-range-thumb {
  transform: scale(1.1);
}

/* Focus states */
.slider:focus {
  outline: none;
}
.slider:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px white, 0 0 0 5px var(--track-fill-color);
}
.slider:focus::-moz-range-thumb {
  box-shadow: 0 0 0 3px white, 0 0 0 5px var(--track-fill-color);
}


/* Vertical styles */
.is-vertical {
  width: var(--thumb-size);
  height: 100%;
  min-height: 100px;
}
.is-vertical .slider {
  writing-mode: bt-lr; /* IE */
  -webkit-appearance: slider-vertical; /* WebKit */
  width: var(--track-height);
  height: 100%;
  background: linear-gradient(to top, var(--track-fill-color) var(--progress, 0%), var(--track-color) var(--progress, 0%));
}
.is-vertical .slider::-webkit-slider-thumb {
  margin-top: 0;
  margin-left: calc(((var(--thumb-size) + var(--thumb-border-width) * 2) - var(--track-height)) / -2);
}
.is-vertical .slider::-moz-range-thumb {
    margin-top: 0;
}
</style> 