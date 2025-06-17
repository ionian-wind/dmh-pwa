<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useModalState } from '@/composables/useModalState';

/**
 * FloatActionButton Component
 * 
 * A customizable round button that floats over the page at a fixed position.
 * When scrolling would cause it to overlap with the footer, it adjusts to stay 50px above the footer.
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
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-right',
  size: 'medium',
  variant: 'primary',
  disabled: false,
  hideOnModal: true
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const buttonRef = ref<HTMLElement>();
const isNearFooter = ref(false);
const scrollTimeout = ref<number>();
const mutationTimeout = ref<number>();
const buttonStyle = ref<{ '--fab-bottom': string }>({ '--fab-bottom': '20px' });
const mutationObserver = ref<MutationObserver>();

// Modal state integration
const { isModalOpen } = useModalState();

const buttonClasses = computed(() => [
  'float-action-button',
  `float-action-button--${props.position}`,
  `float-action-button--${props.size}`,
  `float-action-button--${props.variant}`,
  {
    'float-action-button--disabled': props.disabled,
    'float-action-button--near-footer': isNearFooter.value,
    'float-action-button--hidden': props.hideOnModal && isModalOpen.value
  }
]);

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event);
  }
};

const checkFooterProximity = () => {
  if (!buttonRef.value) return;
  
  const buttonRect = buttonRef.value.getBoundingClientRect();
  const footer = document.querySelector('.app-footer') as HTMLElement;
  
  if (!footer) return;
  
  const footerRect = footer.getBoundingClientRect();
  const buttonBottom = buttonRect.bottom;
  const footerTop = footerRect.top;
  const viewportHeight = window.innerHeight;
  
  // Use a larger buffer zone to prevent rapid switching
  const bufferZone = 80; // Increased from 50px to 80px
  const distanceFromFooter = 50;
  
  // Check if button would overlap with footer (with buffer zone)
  const wouldOverlap = buttonBottom + bufferZone >= footerTop;
  
  // Only update if the state actually changes
  if (isNearFooter.value !== wouldOverlap) {
    isNearFooter.value = wouldOverlap;
  }
  
  // Calculate position
  if (wouldOverlap) {
    const newBottom = Math.max(20, viewportHeight - footerTop + distanceFromFooter);
    buttonStyle.value = { '--fab-bottom': `${newBottom}px` };
  } else {
    buttonStyle.value = { '--fab-bottom': '20px' };
  }
};

const handleScroll = () => {
  // Use requestAnimationFrame for smoother performance
  if (scrollTimeout.value) {
    cancelAnimationFrame(scrollTimeout.value);
  }
  
  scrollTimeout.value = requestAnimationFrame(() => {
    checkFooterProximity();
  });
};

const handleMutation = () => {
  // Debounce mutation events to prevent excessive updates
  if (mutationTimeout.value) {
    clearTimeout(mutationTimeout.value);
  }
  
  mutationTimeout.value = setTimeout(() => {
    checkFooterProximity();
  }, 100);
};

onMounted(() => {
  // Initial check after a short delay to ensure DOM is ready
  setTimeout(() => {
    checkFooterProximity();
  }, 100);
  
  // Set up scroll and resize listeners
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
  
  // Set up MutationObserver to watch for DOM changes
  mutationObserver.value = new MutationObserver((mutations) => {
    // Check if any mutations affect the layout
    const hasLayoutChanges = mutations.some(mutation => {
      // Check for changes to the footer or main content
      const target = mutation.target as Element;
      return target.closest('.app-footer') || 
             target.closest('.main-content') || 
             target.closest('.app') ||
             mutation.type === 'childList' ||
             mutation.type === 'attributes';
    });
    
    if (hasLayoutChanges) {
      handleMutation();
    }
  });
  
  // Start observing the document body for changes
  if (mutationObserver.value) {
    mutationObserver.value.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
});

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleScroll);
  
  // Clean up timeouts
  if (scrollTimeout.value) {
    cancelAnimationFrame(scrollTimeout.value);
  }
  if (mutationTimeout.value) {
    clearTimeout(mutationTimeout.value);
  }
  
  // Clean up MutationObserver
  if (mutationObserver.value) {
    mutationObserver.value.disconnect();
  }
});
</script>

<template>
  <button
    ref="buttonRef"
    :class="buttonClasses"
    :style="buttonStyle"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<style scoped>
.float-action-button {
  position: fixed;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.3s ease, visibility 0.3s ease;
  z-index: 1000;
  font-weight: bold;
}

.float-action-button:hover:not(.float-action-button--disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.float-action-button:active:not(.float-action-button--disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.float-action-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.float-action-button--hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
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
  bottom: var(--fab-bottom, 20px);
  left: 20px;
}

.float-action-button--bottom-right {
  bottom: var(--fab-bottom, 20px);
  right: 20px;
}

/* Size variants */
.float-action-button--small {
  width: 48px;
  height: 48px;
  font-size: 16px;
}

.float-action-button--medium {
  width: 56px;
  height: 56px;
  font-size: 20px;
}

.float-action-button--large {
  width: 64px;
  height: 64px;
  font-size: 24px;
}

/* Color variants */
.float-action-button--primary {
  background: var(--color-primary, #2196f3);
  color: white;
}

.float-action-button--primary:hover:not(.float-action-button--disabled) {
  background: var(--color-primary-dark, #1976d2);
}

.float-action-button--secondary {
  background: var(--color-secondary, #6c757d);
  color: white;
}

.float-action-button--secondary:hover:not(.float-action-button--disabled) {
  background: var(--color-secondary-dark, #545b62);
}

.float-action-button--success {
  background: var(--color-success, #28a745);
  color: white;
}

.float-action-button--success:hover:not(.float-action-button--disabled) {
  background: var(--color-success-dark, #1e7e34);
}

.float-action-button--danger {
  background: var(--color-danger, #dc3545);
  color: white;
}

.float-action-button--danger:hover:not(.float-action-button--disabled) {
  background: var(--color-danger-dark, #c82333);
}

.float-action-button--warning {
  background: var(--color-warning, #ffc107);
  color: #212529;
}

.float-action-button--warning:hover:not(.float-action-button--disabled) {
  background: var(--color-warning-dark, #e0a800);
}
</style> 