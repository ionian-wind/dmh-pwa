import { nextTick, onMounted, onUnmounted, ref } from 'vue';

/**
 * Tracks the viewport rectangle occupied by the Quasar page container.
 *
 * Dialogs that should align with the page content (excluding the left menu and
 * right sidebar) can use this instead of guessing drawer widths.
 */
export function usePageContentRect() {
  const left = ref(0);
  const width = ref(0);
  let observer: ResizeObserver | null = null;
  let observedElement: HTMLElement | null = null;

  function update() {
    if (!observedElement) {
      observedElement =
        document.querySelector<HTMLElement>('.q-page-container');
    }
    if (!observedElement) return;

    const rect = observedElement.getBoundingClientRect();
    const style = getComputedStyle(observedElement);
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight) || 0;

    left.value = Math.round(rect.left + paddingLeft);
    width.value = Math.round(rect.width - paddingLeft - paddingRight);
  }

  function observe() {
    update();
    if (!observedElement || typeof ResizeObserver === 'undefined') return;

    observer?.disconnect();
    observer = new ResizeObserver(update);
    observer.observe(observedElement);
  }

  onMounted(() => {
    void nextTick(observe);
    window.addEventListener('resize', update);
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
    observedElement = null;
    window.removeEventListener('resize', update);
  });

  return { left, width, update };
}
