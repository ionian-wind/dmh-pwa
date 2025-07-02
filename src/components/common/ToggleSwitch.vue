<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  label: ''
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue);
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggle();
  }
}
</script>

<template>
  <div class="toggle-container" :class="{ disabled: disabled }">
    <button
      type="button"
      class="toggle-switch"
      :class="{ active: modelValue, disabled: disabled }"
      @click="toggle"
      @keydown="handleKeydown"
      :disabled="disabled"
      :aria-checked="modelValue"
      :aria-label="$t(label)"
      role="switch"
      tabindex="0"
    >
      <div class="toggle-slider"></div>
    </button>
    <label v-if="label" class="toggle-label" @click="toggle">{{ $t(label) }}</label>
  </div>
</template>

<style scoped>
.toggle-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-container.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.toggle-switch {
  position: relative;
  width: 3rem;
  height: 1.5rem;
  background: var(--color-background-soft);
  border: 2px solid var(--color-border);
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  padding: 0;
}

.toggle-switch:hover:not(.disabled) {
  border-color: var(--color-primary);
}

.toggle-switch.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.toggle-switch.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1rem;
  height: 1rem;
  background: var(--color-background);
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-slider {
  transform: translateX(1.5rem);
}

.toggle-label {
  font-size: 0.9rem;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}

.toggle-container.disabled .toggle-label {
  cursor: not-allowed;
}

/* Focus styles for accessibility */
.toggle-switch:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style> 