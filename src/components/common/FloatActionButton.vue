<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
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
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-right',
  size: 'medium',
  variant: 'primary',
  disabled: false,
  hideOnModal: true,
  static: false
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

// Modal state integration
const { isModalOpen } = useModalState();

const buttonClasses = computed(() => [
  'float-action-button',
  `float-action-button--${props.position}`,
  `float-action-button--${props.size}`,
  `float-action-button--${props.variant}`,
  {
    'float-action-button--disabled': props.disabled,
    'float-action-button--hidden': props.hideOnModal && isModalOpen.value,
    'float-action-button--static': props.static
  }
]);

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event);
  }
};
</script>

<template>
  <button
    :class="buttonClasses"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </button>
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
  transition: all 0.3s ease;
}

.float-action-button--static {
  position: static;
}

/* Hidden state */
.float-action-button--hidden {
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
}

/* Disabled state */
.float-action-button--disabled {
  cursor: not-allowed;
  background-color: #ccc !important;
  box-shadow: none;
  opacity: 0.7;
}

/* Size variants */
.float-action-button--small {
  width: 40px;
  height: 40px;
  font-size: 1rem;
}
.float-action-button--medium {
  width: 56px;
  height: 56px;
}
.float-action-button--large {
  width: 72px;
  height: 72px;
  font-size: 2rem;
}

/* Color variants */
.float-action-button--primary {
  background-color: var(--primary-color);
  color: white;
}
.float-action-button--primary:hover:not(:disabled) {
  background-color: #1a1a2a;
}
.float-action-button--secondary {
  background-color: var(--secondary-color);
  color: white;
}
.float-action-button--secondary:hover:not(:disabled) {
  background-color: #263849;
}
.float-action-button--success {
  background-color: #28a745;
  color: white;
}
.float-action-button--success:hover:not(:disabled) {
  background-color: #218838;
}
.float-action-button--danger {
  background-color: #dc3545;
  color: white;
}
.float-action-button--danger:hover:not(:disabled) {
  background-color: #c82333;
}
.float-action-button--warning {
  background-color: #ffc107;
  color: #212529;
}
.float-action-button--warning:hover:not(:disabled) {
  background-color: #e0a800;
}

/* Position variants */
.float-action-button--top-left {
  top: 20px;
  left: 20px;
}
.float-action-button--top-right {
  top: 20px;
  right: 20px;
}
.float-action-button--bottom-left {
  bottom: 20px;
  left: 20px;
}
.float-action-button--bottom-right {
  bottom: 20px;
  right: 20px;
}
</style> 