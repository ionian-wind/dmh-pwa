export const MAX_SIMULATION_MS = 6_000;
export const SETTLE_MS = 180;

/** True when cosmetic physics has run long enough and must be forced down. */
export function hasSimulationTimedOut(
  startedAt: number,
  now: number,
  max = MAX_SIMULATION_MS,
): boolean {
  return now - startedAt > max;
}
