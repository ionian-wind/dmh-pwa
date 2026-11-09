let installed = false;

/**
 * OpenLayers creates a dedicated 1x1 canvas for pixel hit detection without the
 * `willReadFrequently` hint. Chrome then warns whenever features are queried by
 * pixel. Limit the hint to those tiny hit-detection canvases so the main map
 * renderer keeps its default performance characteristics.
 */
export function enableFrequentHitDetectionReads() {
  if (installed || typeof HTMLCanvasElement === 'undefined') return;
  const prototype = HTMLCanvasElement.prototype;
  if (typeof prototype.getContext !== 'function') return;

  const original = prototype.getContext as (
    this: HTMLCanvasElement,
    contextId: string,
    options?: CanvasRenderingContext2DSettings,
  ) => RenderingContext | null;
  prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    options?: CanvasRenderingContext2DSettings,
  ) {
    if (
      contextId === '2d' &&
      this.width <= 1 &&
      this.height <= 1 &&
      !options?.willReadFrequently
    ) {
      return original.call(this, contextId, {
        ...options,
        willReadFrequently: true,
      } as CanvasRenderingContext2DSettings);
    }
    return original.call(this, contextId, options);
  } as typeof prototype.getContext;

  installed = true;
}
