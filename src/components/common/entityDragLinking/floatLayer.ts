let nextFloatZIndex = 20;

/** Allocate a stacking level for a newly hovered card. */
export function nextFloatLayerZIndex() {
  return nextFloatZIndex++;
}
