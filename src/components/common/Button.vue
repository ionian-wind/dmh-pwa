<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'link' | 'light';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  type: 'button',
  loading: false
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    event.stopPropagation();
    emit('click', event);
  }
}
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[
      `btn--${variant}`,
      `btn--${size}`,
      { 'btn--disabled': disabled || loading }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <div v-if="loading" class="btn__loading">
      <div class="btn__spinner"></div>
    </div>
    <slot v-else />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  outline: none;
  user-select: none;
  white-space: nowrap;
}

.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Size variants */
.btn--small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  min-height: 2rem;
}

.btn--medium {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  min-height: 2.5rem;
}

.btn--large {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
  min-height: 3rem;
}

/* Color variants */
.btn--primary {
  background: var(--color-primary);
  color: white;
}

.btn--primary:hover:not(.btn--disabled) {
  background: var(--color-primary-dark);
}

.btn--secondary {
  background: var(--color-background-soft);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn--secondary:hover:not(.btn--disabled) {
  background: var(--color-background-mute);
}

.btn--danger {
  background: var(--color-danger);
  color: white;
}

.btn--danger:hover:not(.btn--disabled) {
  background: var(--color-danger-dark);
}

.btn--success {
  background: var(--color-success);
  color: white;
}

.btn--success:hover:not(.btn--disabled) {
  background: var(--color-success-dark);
}

.btn--warning {
  background: var(--color-warning);
  color: white;
}

.btn--warning:hover:not(.btn--disabled) {
  background: var(--color-warning-dark);
}

.btn--link, .btn--light {
  background: transparent;
  color: var(--color-text, #666);
  border: none;
  padding: 0.25rem 0.5rem;
  text-decoration: none;
  transition: all 0.2s ease-in-out;
}

.btn--link:hover:not(.btn--disabled) {
  background: var(--color-primary-alpha);
  text-decoration-color: var(--color-primary);
  transform: translateY(-1px);
}

.btn--light:hover:not(.btn--disabled) {
  color: var(--primary-color, #4f46e5);
  background-color: rgba(79, 70, 229, 0.1);
  transform: scale(1.1);
}

/* Disabled state */
.btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

/* Loading state */
.btn__loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Focus styles for different variants */
.btn--secondary:focus-visible {
  outline-color: var(--color-border);
}

.btn--danger:focus-visible {
  outline-color: var(--color-danger);
}

.btn--success:focus-visible {
  outline-color: var(--color-success);
}

.btn--warning:focus-visible {
  outline-color: var(--color-warning);
}

.btn--link:focus-visible {
  outline-color: var(--color-primary);
}
</style> 