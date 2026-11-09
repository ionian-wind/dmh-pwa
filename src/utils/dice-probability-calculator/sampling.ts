import { cryptoRng, pickWeightedBigIntIndex, type Rng } from '../rng';
import type { Die } from './die';
import type { Outcome } from './types';

/**
 * Draw one face from a probability distribution using a shared RNG. Returns
 * `undefined` for an empty distribution.
 */
export function sampleDie(
  die: Die,
  rng: Rng = cryptoRng(),
): number | undefined {
  return sampleOutcomes(die.outcomes(), 1, rng)[0];
}

/**
 * Draw `amount` values with replacement from weighted outcomes. This is the
 * bridge between the exact probability graph and the shared RNG library.
 */
export function sampleOutcomes(
  outcomes: readonly Pick<Outcome, 'value' | 'weight'>[],
  amount: number,
  rng: Rng = cryptoRng(),
): number[] {
  if (amount <= 0) return [];
  const valid = outcomes.filter((outcome) => outcome.weight > 0n);
  if (valid.length === 0) return [];
  const weights = valid.map((outcome) => outcome.weight);
  const result: number[] = [];
  for (let index = 0; index < amount; index += 1) {
    const picked = pickWeightedBigIntIndex(weights, rng, 'probability');
    if (picked === -1) break;
    result.push(valid[picked].value);
  }
  return result;
}
