export function debugLog(...args: any[]) {
  if (
    typeof process !== 'undefined' &&
    (process.env.BAG_OF_DICE_DEBUG || process.env.DEBUG)
  ) {
    // eslint-disable-next-line no-console
    console.log('[BagOfDice]', ...args);
  }
}

export function debugTrace(namespace: string, ...args: any[]) {
  if (
    typeof process !== 'undefined' &&
    (process.env.BAG_OF_DICE_DEBUG || process.env.DEBUG)
  ) {
    // eslint-disable-next-line no-console
    console.log(`[BagOfDice:${namespace}]`, ...args);
  }
} 