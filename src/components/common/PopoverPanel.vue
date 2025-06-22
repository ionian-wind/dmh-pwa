<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

interface Props {
  isOpen: boolean;
  triggerEl?: HTMLElement | null;
  trigger?: 'click' | 'hover' | 'focus';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end' | 'left-start' | 'left-center' | 'left-end' | 'right-start' | 'right-center' | 'right-end';
  offset?: number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  autoFocus?: boolean;
  trapFocus?: boolean;
  title?: string;
  maxWidth?: string;
  minWidth?: string;
  disableInternalTrigger?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  triggerEl: undefined,
  trigger: 'click',
  placement: 'bottom',
  offset: 8,
  closeOnClickOutside: true,
  closeOnEscape: true,
  autoFocus: false,
  trapFocus: false,
  maxWidth: undefined,
  minWidth: undefined,
  disableInternalTrigger: false
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open'): void;
}>();

const popoverRef = ref<HTMLDivElement>();
const triggerRef = ref<HTMLElement>();
const isVisible = ref(false);
const position = ref({ top: 0, left: 0 });
const activePlacement = ref(props.placement);

// Computed classes
const popoverClasses = computed(() => [
  'popover-panel',
  `popover-panel--${activePlacement.value}`,
  { 'popover-panel--visible': isVisible.value }
]);

// Position calculation
function calculatePosition() {
  // Use the actual slotted element for measurement, not the wrapper div
  const triggerEl = props.triggerEl || triggerRef.value?.firstElementChild || triggerRef.value;

  if (!triggerEl || !popoverRef.value) {
    return;
  }

  const triggerRect = triggerEl.getBoundingClientRect();
  
  // Wait for popover to be rendered and get its dimensions
  if (!popoverRef.value.offsetWidth || !popoverRef.value.offsetHeight) {
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      calculatePosition();
    });
    return;
  }
  
  const popoverRect = popoverRef.value.getBoundingClientRect();
  
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = 0;
  let left = 0;
  let finalPlacement = props.placement as string;

  const basePlacement = props.placement.split('-')[0];
  const alignment = props.placement.includes('-') ? props.placement.split('-')[1] : 'center';

  // Try the preferred placement first
  let placementResult = calculatePlacement(basePlacement, alignment, triggerRect, popoverRect, viewportWidth, viewportHeight);
  
  // If it doesn't fit, try alternatives
  if (!placementResult.fits) {
    const alternatives = getAlternativePlacements(basePlacement);
    for (const altPlacement of alternatives) {
      const altResult = calculatePlacement(altPlacement, alignment, triggerRect, popoverRect, viewportWidth, viewportHeight);
      if (altResult.fits) {
        placementResult = altResult;
        finalPlacement = altPlacement;
        break;
      }
    }
  }

  // If no placement fits, use the original and let it be clipped
  top = placementResult.top;
  left = placementResult.left;

  // Final viewport boundary check with more aggressive clamping
  const minMargin = 8;
  const maxMargin = 16;
  
  // Ensure popover doesn't go off-screen
  if (left < minMargin) left = minMargin;
  if (top < minMargin) top = minMargin;
  if (left + popoverRect.width > viewportWidth - minMargin) {
    left = viewportWidth - popoverRect.width - minMargin;
  }
  if (top + popoverRect.height > viewportHeight - minMargin) {
    top = viewportHeight - popoverRect.height - minMargin;
  }

  // Additional check for very small viewports
  if (viewportWidth < 400) {
    left = maxMargin;
    if (left + popoverRect.width > viewportWidth - maxMargin) {
      left = viewportWidth - popoverRect.width - maxMargin;
    }
  }

  position.value = { top, left };
  activePlacement.value = finalPlacement as any;
}

function calculateAlignment(alignment: string, triggerRect: DOMRect, popoverRect: DOMRect) {
  if (alignment === 'start') {
    return triggerRect.left;
  }
  if (alignment === 'end') {
    return triggerRect.right - popoverRect.width;
  }
  // Default to center
  return triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2);
}

function calculateVerticalAlignment(alignment: string, triggerRect: DOMRect, popoverRect: DOMRect) {
  if (alignment === 'start') {
    return triggerRect.top;
  }
  if (alignment === 'end') {
    return triggerRect.bottom - popoverRect.height;
  }
  // Default to center
  return triggerRect.top + (triggerRect.height / 2) - (popoverRect.height / 2);
}

function calculatePlacement(basePlacement: string, alignment: string, triggerRect: DOMRect, popoverRect: DOMRect, viewportWidth: number, viewportHeight: number) {
  let top = 0;
  let left = 0;
  let fits = true;

  // Calculate Popover Position
  switch (basePlacement) {
    case 'top':
      top = triggerRect.top - popoverRect.height - props.offset;
      left = calculateAlignment(alignment, triggerRect, popoverRect);
      break;
    case 'bottom':
      top = triggerRect.bottom + props.offset;
      left = calculateAlignment(alignment, triggerRect, popoverRect);
      break;
    case 'left':
      top = calculateVerticalAlignment(alignment, triggerRect, popoverRect);
      left = triggerRect.left - popoverRect.width - props.offset;
      break;
    case 'right':
      top = calculateVerticalAlignment(alignment, triggerRect, popoverRect);
      left = triggerRect.right + props.offset;
      break;
  }
  
  // Check if it fits within the viewport
  if (top < 8 || left < 8 || (left + popoverRect.width) > (viewportWidth - 8) || (top + popoverRect.height) > (viewportHeight - 8)) {
    fits = false;
  }

  // Special handling for large content (like jukebox player)
  if (popoverRect.width > viewportWidth - 16 || popoverRect.height > viewportHeight - 16) {
    // Center the popover if it's too large
    left = Math.max(8, (viewportWidth - popoverRect.width) / 2);
    top = Math.max(8, (viewportHeight - popoverRect.height) / 2);
    fits = true;
  }

  return { top, left, fits };
}

function getAlternativePlacements(preferred: string): string[] {
  const placements = ['top', 'bottom', 'left', 'right'];
  
  const opposite: { [key: string]: string } = {
    top: 'bottom', bottom: 'top', left: 'right', right: 'left'
  };

  // Prioritize the opposite direction, then the rest
  return [opposite[preferred], ...placements.filter(p => p !== preferred && p !== opposite[preferred])];
}

// Event handlers
function handleKeydown(e: KeyboardEvent) {
  if (!isVisible.value) return;

  if (e.key === 'Escape' && props.closeOnEscape) {
    close();
  }

  if (props.trapFocus && e.key === 'Tab') {
    const focusableElements = popoverRef.value?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements && focusableElements.length > 0) {
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!isVisible.value || !props.closeOnClickOutside) return;
  
  const target = e.target as Node;
  if (popoverRef.value && !popoverRef.value.contains(target) && 
      triggerRef.value && !triggerRef.value.contains(target)) {
    close();
  }
}

function handleTriggerClick() {
  if (props.disableInternalTrigger) {
    return;
  }
  
  if (props.trigger === 'click') {
    toggle();
  }
}

function handleTriggerMouseEnter() {
  if (props.trigger === 'hover') {
    open();
  }
}

function handleTriggerMouseLeave() {
  if (props.trigger === 'hover') {
    close();
  }
}

function handleTriggerFocus() {
  if (props.trigger === 'focus') {
    open();
  }
}

function handleTriggerBlur() {
  if (props.trigger === 'focus') {
    // Small delay to allow clicking inside the popover
    setTimeout(() => {
      if (!popoverRef.value?.contains(document.activeElement)) {
        close();
      }
    }, 100);
  }
}

// Public methods
function open() {
  if (isVisible.value) return;
  
  activePlacement.value = props.placement;
  isVisible.value = true;
  emit('open');
  
  // Use nextTick to ensure DOM is updated, then calculate position
  nextTick(() => {
    // Add a small delay to ensure the popover is fully rendered
    setTimeout(() => {
      calculatePosition();
      if (props.autoFocus && popoverRef.value) {
        const firstFocusable = popoverRef.value.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    }, 10);
  });
}

function close() {
  if (!isVisible.value) return;
  
  isVisible.value = false;
  emit('close');
}

function toggle() {
  if (isVisible.value) {
    close();
  } else {
    open();
  }
}

// Expose methods
defineExpose({
  open,
  close,
  toggle
});

// Watchers
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    open();
  } else {
    close();
  }
});

watch(() => isVisible.value, (visible) => {
  if (visible) {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);
    
    // Recalculate position after a short delay to ensure content is rendered
    setTimeout(() => {
      calculatePosition();
    }, 50);
  } else {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('mousedown', handleClickOutside);
    window.removeEventListener('resize', calculatePosition);
    window.removeEventListener('scroll', calculatePosition);
  }
});

// Lifecycle
onMounted(() => {
  if (props.isOpen) {
    open();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('mousedown', handleClickOutside);
  window.removeEventListener('resize', calculatePosition);
  window.removeEventListener('scroll', calculatePosition);
});
</script>

<template>
  <div class="popover-container">
    <!-- Trigger slot -->
    <div
      ref="triggerRef"
      class="popover-trigger"
      @click="handleTriggerClick"
      @mouseenter="handleTriggerMouseEnter"
      @mouseleave="handleTriggerMouseLeave"
      @focus="handleTriggerFocus"
      @blur="handleTriggerBlur"
    >
      <slot name="trigger" />
    </div>

    <!-- Popover panel -->
    <Transition name="popover-fade">
      <div
        v-if="isVisible"
        ref="popoverRef"
        :class="popoverClasses"
        :style="{
          top: `${position.top}px`,
          left: `${position.left}px`,
          maxWidth: maxWidth,
          minWidth: minWidth
        }"
        role="dialog"
        :aria-labelledby="title ? 'popover-title' : undefined"
        aria-modal="true"
      >
        <!-- Corner slots for custom buttons -->
        <!-- Usage: <template #corner-left>...</template> and <template #corner-right>...</template> -->
        <div class="popover-corner popover-corner--left">
          <slot name="corner-left" />
        </div>
        <div class="popover-corner popover-corner--right">
          <slot name="corner-right" />
        </div>
        <!-- Header -->
        <div v-if="title" class="popover-panel__header">
          <h3 id="popover-title" class="popover-panel__title">{{ title }}</h3>
        </div>

        <!-- Content -->
        <div class="popover-panel__content">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.popover-container {
  position: relative;
  display: inline-block;
}

.popover-trigger {
  display: inline-block;
  cursor: pointer;
}

.popover-panel {
  position: fixed;
  z-index: 9000;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-lg);
  padding: 0;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.popover-panel__header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-background-soft);
}

.popover-panel__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.popover-panel__content {
  padding: var(--spacing-md);
  overflow-y: auto;
  flex: 1;
}

/* Transitions */
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity var(--transition-normal), transform var(--transition-normal);
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Focus styles */
.popover-panel:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Placement-specific styles */
.popover-panel--top-center,
.popover-panel--bottom-center {
  transform-origin: center bottom;
}

.popover-panel--left-center,
.popover-panel--right-center {
  transform-origin: center left;
}

/* Center alignment visual indicators (optional) */
.popover-panel--top-center::before,
.popover-panel--bottom-center::before {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
}

.popover-panel--top-center::before {
  bottom: -6px;
  border-top: 6px solid var(--color-border);
}

.popover-panel--bottom-center::before {
  top: -6px;
  border-bottom: 6px solid var(--color-border);
}

.popover-panel--left-center::after,
.popover-panel--right-center::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
}

.popover-panel--left-center::after {
  right: -6px;
  border-left: 6px solid var(--color-border);
}

.popover-panel--right-center::after {
  left: -6px;
  border-right: 6px solid var(--color-border);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .popover-panel {
    max-width: calc(100vw - 32px) !important;
    min-width: 200px !important;
    max-height: calc(100vh - 32px) !important;
  }
}

@media (max-width: 480px) {
  .popover-panel {
    max-width: calc(100vw - 16px) !important;
    min-width: 150px !important;
    max-height: calc(100vh - 16px) !important;
  }
}

.popover-corner {
  position: absolute;
  top: 0.5rem;
  z-index: 20;
  pointer-events: auto;
}
.popover-corner--left {
  left: 0.5rem;
}
.popover-corner--right {
  right: 0.5rem;
}
</style> 
