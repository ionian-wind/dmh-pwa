import { ref } from 'vue';

let nextLayer = 6000;

/**
 * Shared z-index stack for floating panels/dialogs. Clicking or focusing a
 * layer raises it above the others without closing them.
 */
export function useFloatingLayer() {
  const zIndex = ref(++nextLayer);

  function bringToFront(): void {
    zIndex.value = ++nextLayer;
  }

  return { zIndex, bringToFront };
}
