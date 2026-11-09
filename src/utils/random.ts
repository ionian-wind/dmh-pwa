export * from './rng';

/**
 * Legacy convenience wrapper used by non-dice modules. New code should inject a
 * shared `Rng` or use `cryptoRng()`/`sequenceRng()` directly.
 */
export const rng = (): number => Math.random();

export const getRandomInt = (max: number): number => Math.floor(rng() * max);
