<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useFloating, offset, flip, shift, autoUpdate, autoPlacement } from '@floating-ui/vue';
import type { Placement } from '@floating-ui/vue';

interface Props {
  isOpen: boolean;
  triggerEl?: any;
  trigger?: 'click' | 'hover' | 'focus';
  placement?: Placement;
  offset?: number;
  verticalOffset?: number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  autoFocus?: boolean;
  trapFocus?: boolean;
  title?: string;
  maxWidth?: string;
  minWidth?: string;
  disableInternalTrigger?: boolean;
  autoPlacement?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  triggerEl: undefined,
  trigger: 'click',
  placement: 'bottom',
  offset: 8,
  verticalOffset: 0,
  closeOnClickOutside: true,
  closeOnEscape: true,
  autoFocus: false,
  trapFocus: false,
  maxWidth: undefined,
  minWidth: undefined,
  disableInternalTrigger: false,
  autoPlacement: false
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'open'): void;
}>();

const popoverRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);

const floatingPlacementValue = computed(() => props.placement || 'bottom');

// Use Floating UI for positioning
const { floatingStyles, placement: floatingPlacement } = useFloating(
  triggerRef,
  popoverRef,
  {
    ...(props.autoPlacement ? {} : {placement: floatingPlacementValue}),
    middleware: [
      offset(props.offset || 8),
      ...(props.autoPlacement ? [autoPlacement()] : [flip(), shift()]),
    ],
    whileElementsMounted: autoUpdate,
  }
);

// Computed classes
const popoverClasses = computed(() => [
  'popover-panel',
  `popover-panel--${floatingPlacement}`,
  { 'popover-panel--visible': isVisible.value }
]);

// Event handlers
function handleKeydown(e: KeyboardEvent) {
  if (!isVisible.value) return;

  if (e.key === 'Escape' && props.closeOnEscape) {
    close();
  }

  if (props.trapFocus && e.key === 'Tab') {
    const el = popoverRef.value;
    if (!el) return;
    const focusableElements = el.querySelectorAll(
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
  const popoverEl = popoverRef.value;
  const triggerEl = triggerRef.value;
  if (popoverEl && !popoverEl.contains(target) && triggerEl && !triggerEl.contains(target)) {
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
  
  isVisible.value = true;
  emit('open');
  
  // Use nextTick to ensure DOM is updated, then calculate position
  nextTick(() => {
    // Add a small delay to ensure the popover is fully rendered
    setTimeout(() => {
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
  } else {
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('mousedown', handleClickOutside);
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
});
</script>

<template>
  <div>
    <!-- Trigger slot -->
    <div
      ref="triggerRef"
      @click="handleTriggerClick"
      @mouseenter="handleTriggerMouseEnter"
      @mouseleave="handleTriggerMouseLeave"
      @focus="handleTriggerFocus"
      @blur="handleTriggerBlur"
      class="popover-trigger"
    >
      <slot name="trigger" />
    </div>

    <!-- Popover panel -->
    <Transition name="popover-fade">
      <div
        v-if="isVisible"
        ref="popoverRef"
        :class="popoverClasses"
        :style="{ ...floatingStyles, maxWidth: props.maxWidth, minWidth: props.minWidth }"
        role="dialog"
        :aria-labelledby="title ? 'popover-title' : undefined"
        aria-modal="true"
      >
        <!-- Corner slots for custom buttons -->
        <!-- Usage: <template #corner-left>...</template> and <template #corner-right>...</template> -->
        <div v-if="title || $slots['corner-right'] || $slots['corner-left']" class="popover-head">
          <div class="popover-corner popover-corner--left">
            <slot name="corner-left" />
          </div>
          <!-- Header -->
          <div class="popover-panel__header">
            <h3 v-if="title" id="popover-title" class="popover-panel__title">{{ title }}</h3>
          </div>
          <div class="popover-corner popover-corner--right">
            <slot name="corner-right" />
          </div>
        </div>
        
        <!-- Content -->
        <div class="popover-panel--content">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
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
  padding: var(--base-padding);
}

.popover-head {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2.5rem;
}

.popover-corner {
  flex: 0 0 auto;
  min-width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 20;
  pointer-events: auto;
}
.popover-corner--left {
  justify-content: flex-start;
}
.popover-corner--right {
  justify-content: flex-end;
}

.popover-panel__header {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  min-width: 0;
}

.popover-panel__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popover-panel--content {
  overflow: hidden;
  flex: 1;
}

/* Transitions */
.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.popover-fade-enter-from,
.popover-fade-leave-to {
  opacity: 0;
}

/* Focus styles */
.popover-panel:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
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
    max-width: calc(97vw - 16px) !important;
    min-width: 150px !important;
    max-height: calc(100vh - 16px) !important;
  }
}
</style> 
