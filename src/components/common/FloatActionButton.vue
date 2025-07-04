<script setup lang="ts">
import { useModalState } from '@/composables/useModalState';

/**
 * FloatActionButton Component
 *
 * A customizable round button that floats over the page at a fixed position.
 * Automatically hides when modals are open.
 *
 * @example
 * ```vue
 * <FloatActionButton
 *   position="bottom-right"
 *   size="medium"
 *   variant="primary"
 *   @click="handleClick"
 * >
 *   +
 * </FloatActionButton>
 * ```
 */
interface Props {
  /** Position of the button on the screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Color variant of the button */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether to hide when modals are open */
  hideOnModal?: boolean;
  /** Whether the button should have static positioning */
  static?: boolean;
  /** Whether to show ripple effect on click */
  ripple?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-right',
  size: 'medium',
  variant: 'primary',
  disabled: false,
  hideOnModal: true,
  static: false,
  ripple: true,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

// Modal state integration
const { isModalOpen } = useModalState();

// Map position prop to Quasar's fixed/position system
const positionMap: Record<string, { fixed: boolean; position: string }> = {
  'top-left': { fixed: true, position: 'top-left' },
  'top-right': { fixed: true, position: 'top-right' },
  'bottom-left': { fixed: true, position: 'bottom-left' },
  'bottom-right': { fixed: true, position: 'bottom-right' },
};

// Map size to Quasar size
const sizeMap: Record<string, string> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

// Map variant to Quasar color
const colorMap: Record<string, string> = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'positive',
  danger: 'negative',
  warning: 'warning',
};
</script>

<template>
  <QFab
    v-if="!props.hideOnModal || !isModalOpen"
    :color="colorMap[props.variant]"
    :size="sizeMap[props.size]"
    :disable="props.disabled"
    :ripple="props.ripple"
    :fixed="!props.static && positionMap[props.position]?.fixed"
    :position="
      !props.static ? positionMap[props.position]?.position : undefined
    "
    @click="(event: MouseEvent) => emit('click', event)"
  >
    <slot />
  </QFab>
</template>

<style scoped>
/* Common styles for the button */
.float-action-button {
  position: fixed;
  z-index: 1000;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
  transform: translateZ(0); /* Enable hardware acceleration */
}

.float-action-button--static {
  position: static;
}

/* Hidden state with smooth animation */
.float-action-button--hidden {
  transform: scale(0) translateZ(0);
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Disabled state */
.float-action-button--disabled {
  cursor: not-allowed;
  background-color: var(--color-text-lightest) !important;
  box-shadow: none;
  opacity: 0.7;
  transform: scale(1) translateZ(0);
}

/* Hover animations */
.float-action-button:hover:not(.float-action-button--disabled) {
  transform: scale(1.05) translateZ(0);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.float-action-button--hovered:not(.float-action-button--disabled) {
  transform: scale(1.05) translateZ(0);
}

/* Press animations */
.float-action-button--pressed:not(.float-action-button--disabled) {
  transform: scale(0.95) translateZ(0);
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Size variants with smooth transitions */
.float-action-button--small {
  width: 40px;
  height: 40px;
  font-size: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-action-button--medium {
  width: 56px;
  height: 56px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-action-button--large {
  width: 72px;
  height: 72px;
  font-size: 2rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Color variants with enhanced hover effects */
.float-action-button--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-action-button--primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
  box-shadow: 0 8px 25px var(--color-primary-shadow, rgba(30, 30, 46, 0.3));
}

.float-action-button--secondary {
  background-color: var(--color-secondary);
  color: var(--color-text-inverse);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-action-button--secondary:hover:not(:disabled) {
  background-color: var(--color-secondary-dark, #263849);
  box-shadow: 0 8px 25px var(--color-secondary-shadow, rgba(44, 62, 80, 0.3));
}

.float-action-button--success {
  background-color: var(--color-success);
  color: var(--color-text-inverse);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-action-button--success:hover:not(:disabled) {
  background-color: var(--color-success-dark);
  box-shadow: 0 8px 25px var(--color-success-shadow, rgba(76, 175, 80, 0.3));
}

.float-action-button--danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-action-button--danger:hover:not(:disabled) {
  background-color: var(--color-danger-dark);
  box-shadow: 0 8px 25px var(--color-danger-shadow, rgba(244, 67, 54, 0.3));
}

.float-action-button--warning {
  background-color: var(--color-warning);
  color: var(--color-text);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-action-button--warning:hover:not(:disabled) {
  background-color: var(--color-warning-dark);
  box-shadow: 0 8px 25px var(--color-warning-shadow, rgba(255, 152, 0, 0.3));
}

/* Position variants with entrance animations */
.float-action-button--top-left {
  top: 20px;
  left: 20px;
  /* animation: slideInTopLeft 0.5s cubic-bezier(0.4, 0, 0.2, 1); */
}

.float-action-button--top-right {
  top: 20px;
  right: 20px;
  /* animation: slideInTopRight 0.5s cubic-bezier(0.4, 0, 0.2, 1); */
}

.float-action-button--bottom-left {
  bottom: 20px;
  left: 20px;
  /* animation: slideInBottomLeft 0.5s cubic-bezier(0.4, 0, 0.2, 1); */
}

.float-action-button--bottom-right {
  bottom: 20px;
  right: 20px;
  /* animation: slideInBottomRight 0.5s cubic-bezier(0.4, 0, 0.2, 1); */
}

/* Ripple effect */
.float-action-button__ripple {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(0);
  animation: ripple 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

/* Entrance animations */
@keyframes slideInTopLeft {
  from {
    transform: translate(-100px, -100px) scale(0);
    opacity: 0;
  }
  to {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}

@keyframes slideInTopRight {
  from {
    transform: translate(100px, -100px) scale(0);
    opacity: 0;
  }
  to {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}

@keyframes slideInBottomLeft {
  from {
    transform: translate(-100px, 100px) scale(0);
    opacity: 0;
  }
  to {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}

@keyframes slideInBottomRight {
  from {
    transform: translate(100px, 100px) scale(0);
    opacity: 0;
  }
  to {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}

/* Ripple animation */
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* Focus styles for accessibility */
.float-action-button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  transform: scale(1.05) translateZ(0);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .float-action-button {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .float-action-button:hover:not(.float-action-button--disabled) {
    transform: scale(1.02) translateZ(0);
  }

  .float-action-button--pressed:not(.float-action-button--disabled) {
    transform: scale(0.98) translateZ(0);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .float-action-button,
  .float-action-button--small,
  .float-action-button--medium,
  .float-action-button--large,
  .float-action-button--primary,
  .float-action-button--secondary,
  .float-action-button--success,
  .float-action-button--danger,
  .float-action-button--warning {
    transition: none;
    animation: none;
  }

  .float-action-button:hover:not(.float-action-button--disabled) {
    transform: none;
  }

  .float-action-button--pressed:not(.float-action-button--disabled) {
    transform: none;
  }

  .float-action-button__ripple {
    animation: none;
  }
}
</style>
