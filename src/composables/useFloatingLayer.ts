import { ref } from 'vue';

const nextByBase = new Map<number, number>();

/**
 * Shared z-index stack for floating panels. Use a lower base for panels and a
 * higher base for dialogs so dialogs stay above panels without closing them.
 */
function nextZ(base: number): number {
  const next = (nextByBase.get(base) ?? base) + 1;
  nextByBase.set(base, next);
  return next;
}

export function useFloatingLayer(base = 5000) {
  const zIndex = ref(nextZ(base));

  function bringToFront(): void {
    zIndex.value = nextZ(base);
  }

  return { zIndex, bringToFront };
}
