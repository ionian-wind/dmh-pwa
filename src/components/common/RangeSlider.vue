<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';

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

const sliderContainerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);

const progressPercentage = computed(() => {
  const range = props.max - props.min;
  if (range === 0) return 0;
  return ((props.modelValue - props.min) / range) * 100;
});

const fillStyle = computed(() => {
  const sizeProperty = props.vertical ? 'height' : 'width';
  return {
    [sizeProperty]: `${progressPercentage.value}%`,
  };
});

const thumbStyle = computed(() => {
  const positionProperty = props.vertical ? 'bottom' : 'left';
  return {
    [positionProperty]: `${progressPercentage.value}%`,
  };
});

function handleInteractionStart(event: MouseEvent | TouchEvent) {
  if (props.disabled) return;
  isDragging.value = true;
  updateValue(event);
  window.addEventListener('mousemove', handleInteractionMove);
  window.addEventListener('touchmove', handleInteractionMove);
  window.addEventListener('mouseup', handleInteractionEnd);
  window.addEventListener('touchend', handleInteractionEnd);
}

function handleInteractionMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  updateValue(event);
}

function handleInteractionEnd() {
  isDragging.value = false;
  window.removeEventListener('mousemove', handleInteractionMove);
  window.removeEventListener('touchmove', handleInteractionMove);
  window.removeEventListener('mouseup', handleInteractionEnd);
  window.removeEventListener('touchend', handleInteractionEnd);
}

function updateValue(event: MouseEvent | TouchEvent) {
  if (!sliderContainerRef.value) return;

  const rect = sliderContainerRef.value.getBoundingClientRect();
  const touch = (event as TouchEvent).touches?.[0];

  let percentage: number;

  if (props.vertical) {
    const clientY = touch ? touch.clientY : (event as MouseEvent).clientY;
    percentage = 1 - ((clientY - rect.top) / rect.height);
  } else {
    const clientX = touch ? touch.clientX : (event as MouseEvent).clientX;
    percentage = (clientX - rect.left) / rect.width;
  }
  
  // Clamp percentage
  percentage = Math.max(0, Math.min(1, percentage));

  let newValue = props.min + percentage * (props.max - props.min);

  // Apply step
  const steppedValue = Math.round(newValue / props.step) * props.step;
  
  // Clamp to min/max after stepping
  const finalValue = Math.max(props.min, Math.min(props.max, steppedValue));

  if (finalValue !== props.modelValue) {
    emit('update:modelValue', finalValue);
  }
}

onBeforeUnmount(() => {
  // Clean up global listeners
  handleInteractionEnd();
});
</script>

<template>
  <div
    ref="sliderContainerRef"
    class="slider-container"
    :class="{ 'is-disabled': disabled, 'is-vertical': vertical, 'is-horizontal': !vertical }"
    @mousedown.prevent="handleInteractionStart"
    @touchstart.prevent="handleInteractionStart"
  >
    <div class="track">
      <div class="track-fill" :style="fillStyle"></div>
    </div>
    <div class="thumb" :style="thumbStyle"></div>
  </div>
</template>

<style scoped>
.slider-container {
  --track-height: 4px;
  --track-color: #e5e7eb;
  --track-fill-color: var(--primary-color, #4f46e5);
  --thumb-size: 14px;
  position: relative;
  cursor: pointer;
  padding: 5px 0;
  width: 100%;
}

.track {
  width: 100%;
  height: var(--track-height);
  background-color: var(--track-color);
  border-radius: var(--track-height);
  position: relative;
  overflow: hidden;
}

.track-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background-color: var(--track-fill-color);
}

.thumb {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--thumb-size);
  height: var(--thumb-size);
  background-color: white;
  border: 2px solid var(--track-fill-color);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.1s ease;
}


.slider-container.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Vertical styles */
.slider-container.is-vertical {
  width: auto;
  height: 100%;
  padding: 0 5px;
}

.is-vertical .track {
  width: var(--track-height);
  height: 100%;
}

.is-vertical .track-fill {
  top: auto;
  bottom: 0;
  width: 100%;
  /* height set by inline style */
}

.is-vertical .thumb {
  top: auto;
  left: 50%;
  bottom: 0;
  transform: translate(-50%, 50%);
}

/* Hover/Active states */
.slider-container.is-horizontal:hover .thumb {
  transform: translate(-50%, -50%) scale(1.1);
}

.slider-container.is-vertical .thumb:hover {
  transform: translate(-50%, 50%) scale(1.1);
}
</style> 