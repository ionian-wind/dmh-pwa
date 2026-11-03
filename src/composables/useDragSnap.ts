import { ref, computed } from 'vue';

const SNAP_THRESHOLD = 200;

interface DragSnapOptions {
  /** Return false to let the card stay where it was dropped. */
  snapBack?: () => boolean;
  /** Called after pointer release, once snap-back has been applied. */
  onRelease?: () => void;
}

export function useDragSnap(options: DragSnapOptions = {}) {
  const translateX = ref(0);
  const translateY = ref(0);
  const isDragging = ref(false);
  const hasTransition = ref(false);

  let startX = 0;
  let startY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;
  let lastX = 0;
  let lastY = 0;
  let captureTarget: HTMLElement | null = null;
  let capturePointerId: number | null = null;

  function onPointerDown(e: PointerEvent) {
    isDragging.value = true;
    hasTransition.value = false;
    startX = e.clientX;
    startY = e.clientY;
    startTranslateX = translateX.value;
    startTranslateY = translateY.value;
    lastX = e.clientX;
    lastY = e.clientY;
    captureTarget = e.target as HTMLElement;
    capturePointerId = e.pointerId;
    captureTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return;
    lastX = e.clientX;
    lastY = e.clientY;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    translateX.value = startTranslateX + dx;
    translateY.value = startTranslateY + dy;
  }

  function releaseCapture() {
    if (
      captureTarget &&
      capturePointerId !== null &&
      typeof captureTarget.releasePointerCapture === 'function'
    ) {
      try {
        captureTarget.releasePointerCapture(capturePointerId);
      } catch {
        // The pointer may already have been released by the browser.
      }
    }
    captureTarget = null;
    capturePointerId = null;
  }

  function onPointerUp() {
    if (!isDragging.value) return;
    isDragging.value = false;
    releaseCapture();

    if ((options.snapBack?.() ?? true) && translateY.value > -SNAP_THRESHOLD) {
      hasTransition.value = true;
      translateX.value = 0;
      translateY.value = 0;
    }

    options.onRelease?.();
  }

  /** Stops the current drag without waiting for pointer-up. */
  function endDrag() {
    if (!isDragging.value) return;
    isDragging.value = false;
    releaseCapture();
  }

  function resetPosition() {
    hasTransition.value = true;
    translateX.value = 0;
    translateY.value = 0;
  }

  /**
   * Starts a new drag offset from the current pointer position. Used when the
   * layout changes mid-drag so the card can animate to the new base position
   * without the next pointer move snapping back to the old origin.
   */
  function rebaseDrag() {
    startX = lastX;
    startY = lastY;
    startTranslateX = 0;
    startTranslateY = 0;
    resetPosition();
  }

  /** Moves the card without animating, e.g. to compensate for a layout change. */
  function setPosition(x: number, y: number) {
    hasTransition.value = false;
    translateX.value = x;
    translateY.value = y;
  }

  /** Keeps the current offset but makes the next pointer move relative to it. */
  function rebaseDragOrigin() {
    startX = lastX;
    startY = lastY;
    startTranslateX = translateX.value;
    startTranslateY = translateY.value;
    hasTransition.value = false;
  }

  function onHide() {
    releaseCapture();
    hasTransition.value = false;
    translateX.value = 0;
    translateY.value = 0;
  }

  const cardStyle = computed(() => ({
    transform: `translate(${translateX.value}px, ${translateY.value}px)`,
    transition: hasTransition.value ? 'transform 0.3s ease' : 'none',
    cursor: isDragging.value ? 'grabbing' : undefined,
  }));

  const transitionHide = computed(() =>
    translateY.value !== 0 ? 'fade' : undefined,
  );

  return {
    cardStyle,
    transitionHide,
    isDragging,
    translateX,
    translateY,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onHide,
    endDrag,
    resetPosition,
    rebaseDrag,
    setPosition,
    rebaseDragOrigin,
  };
}
