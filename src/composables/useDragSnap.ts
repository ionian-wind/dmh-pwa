import { ref, computed } from 'vue';

const SNAP_THRESHOLD = 200;

export function useDragSnap() {
  const translateX = ref(0);
  const translateY = ref(0);
  const isDragging = ref(false);
  const hasTransition = ref(false);

  let startX = 0;
  let startY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;

  function onPointerDown(e: PointerEvent) {
    isDragging.value = true;
    hasTransition.value = false;
    startX = e.clientX;
    startY = e.clientY;
    startTranslateX = translateX.value;
    startTranslateY = translateY.value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    translateX.value = startTranslateX + dx;
    translateY.value = startTranslateY + dy;
  }

  function onPointerUp() {
    if (!isDragging.value) return;
    isDragging.value = false;

    if (translateY.value > -SNAP_THRESHOLD) {
      hasTransition.value = true;
      translateX.value = 0;
      translateY.value = 0;
    }
  }

  function onHide() {
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
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onHide,
  };
}
