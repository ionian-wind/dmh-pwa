<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import {
  IconCaretUp,
  IconCaretUpFilled,
  IconCaretDown,
  IconCaretDownFilled,
} from '@tabler/icons-vue';

const props = defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

const holdTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const holdInterval = ref<ReturnType<typeof setInterval> | null>(null);
const hovered = ref<'up' | 'down' | null>(null);

function clamp(val: number) {
  return Math.max(props.min ?? 0, Math.min(val, props.max ?? 99));
}

function setValue(val: string | number | null) {
  const numeric = Number(val);
  if (Number.isNaN(numeric)) return;
  emit('update:modelValue', clamp(numeric));
}

function adjust(delta: number) {
  emit('update:modelValue', clamp(props.modelValue + delta));
}

function clearHold() {
  if (holdTimer.value !== null) {
    clearTimeout(holdTimer.value);
    holdTimer.value = null;
  }
  if (holdInterval.value !== null) {
    clearInterval(holdInterval.value);
    holdInterval.value = null;
  }
}

function startHold(fn: () => void) {
  holdTimer.value = setTimeout(() => {
    holdInterval.value = setInterval(fn, 80);
  }, 400);
}

onBeforeUnmount(clearHold);
</script>

<template>
  <div class="column items-center q-gutter-y-xs">
    <QBtn
      flat
      dense
      round
      size="sm"
      color="primary"
      @click="adjust(1)"
      @mousedown.prevent="startHold(() => adjust(1))"
      @mouseup="clearHold"
      @mouseenter="hovered = 'up'"
      @mouseleave="
        hovered = null;
        clearHold();
      "
    >
      <component :is="hovered === 'up' ? IconCaretUpFilled : IconCaretUp" />
    </QBtn>
    <QInput
      :model-value="props.modelValue"
      :min="props.min"
      :max="props.max"
      outlined
      hide-bottom-space
      input-class="spinner-input text-center"
      class="spinner-field"
      type="number"
      @update:model-value="setValue"
    />
    <QBtn
      flat
      dense
      round
      size="sm"
      color="primary"
      @click="adjust(-1)"
      @mousedown.prevent="startHold(() => adjust(-1))"
      @mouseup="clearHold"
      @mouseenter="hovered = 'down'"
      @mouseleave="
        hovered = null;
        clearHold();
      "
    >
      <component
        :is="hovered === 'down' ? IconCaretDownFilled : IconCaretDown"
      />
    </QBtn>
  </div>
</template>

<style scoped>
.spinner-input {
  width: 48px;
  font-size: 2.25rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.spinner-input::-webkit-inner-spin-button,
.spinner-input::-webkit-outer-spin-button {
  display: none;
}

.spinner-input[type='number'] {
  -moz-appearance: textfield;
}

.spinner-field {
  width: 96px;
}
</style>
