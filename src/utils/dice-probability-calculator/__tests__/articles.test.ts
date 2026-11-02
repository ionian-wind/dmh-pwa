import { describe, expect, it } from 'vitest';
import { calculate, type OutputResult } from '../index';

function outputs(script: string): OutputResult[] {
  return calculate(script).outputs;
}

function one(script: string): OutputResult {
  const result = outputs(script);
  expect(result).toHaveLength(1);
  return result[0];
}

function prob(output: OutputResult, value: number): number {
  return (
    output.outcomes.find((outcome) => outcome.value === value)?.probability ?? 0
  );
}

function atLeast(output: OutputResult, value: number): number {
  return output.outcomes
    .filter((outcome) => outcome.value >= value)
    .reduce((sum, outcome) => sum + outcome.probability, 0);
}

function expectRange(output: OutputResult, min: number, max: number) {
  expect(output.outcomes[0]?.value).toBe(min);
  expect(output.outcomes[output.outcomes.length - 1]?.value).toBe(max);
}

describe('AnyDice articles', () => {
  describe('4d6 Drop Lowest', () => {
    it('compares the 4d6 drop lowest distribution with 3d6', () => {
      const dropped = one('output [highest 3 of 4d6]');
      const regular = one('output 3d6');

      expect(dropped.mean).toBeCloseTo(12.2446, 3);
      expect(regular.mean).toBeCloseTo(10.5, 3);
      expectRange(dropped, 3, 18);
      expectRange(regular, 3, 18);
    });

    it('finds the chance of at least one 18 among six abilities', () => {
      const ability = one(`
        ABILITIES: 6 d [highest 3 of 4d6]
        output 1 @ ABILITIES
      `);
      expect(atLeast(ability, 18)).toBeCloseTo(0.0934, 3);
    });
  });

  describe('Blades in the Dark', () => {
    const blades = `
      function: blades ROLL:s {
        if 1@ROLL = 6 {
          result: 2 + (2@ROLL = 6)
        }
        result: 1@ROLL >= 4
      }
    `;

    it('handles the zero-dice case by keeping the lowest of 2d6', () => {
      const output = one(`${blades} output [blades 2@2d6]`);
      expect(prob(output, 0)).toBeCloseTo(27 / 36);
      expect(prob(output, 1)).toBeCloseTo(8 / 36);
      expect(prob(output, 2)).toBeCloseTo(1 / 36);
    });

    it('distinguishes bad, messy, clean and critical results', () => {
      const output = one(`${blades} output [blades 4d6]`);
      expect(output.outcomes.map((outcome) => outcome.value)).toEqual([
        0, 1, 2, 3,
      ]);
      expect(
        output.outcomes.reduce((sum, o) => sum + o.probability, 0),
      ).toBeCloseTo(1);
      expect(prob(output, 3)).toBeGreaterThan(0);
    });
  });

  describe('Dice and Averages', () => {
    it('calculates averages of flat, summed and ordered dice', () => {
      expect(one('output 2d4').mean).toBeCloseTo(5);
      expect(one('output 3d4').mean).toBeCloseTo(7.5);
      expect(one('output 1@2d4').mean).toBeCloseTo(3.125);
    });
  });

  describe('D&D 4 Attacks', () => {
    it('uses a simple comparison for hit chance', () => {
      const hit = one('output d20 + 8 >= 15');
      expect(prob(hit, 1)).toBeCloseTo(0.7);
      expect(prob(hit, 0)).toBeCloseTo(0.3);
    });

    it('classifies misses, hits and critical hits', () => {
      const output = one(`
        MISS: 0
        HIT: 1
        CRITICALHIT: 2

        function: attack ROLL:n vs DEFENSE:n {
          if ROLL = 1 { result: MISS }
          if ROLL = 20 {
            if ROLL + ATTACK >= DEFENSE { result: CRITICALHIT }
            result: HIT
          }
          if ROLL + ATTACK >= DEFENSE { result: HIT }
          result: MISS
        }

        ATTACK: 5 + 3
        output [attack d20 vs 15]
      `);
      expect(prob(output, 0)).toBeCloseTo(0.3);
      expect(prob(output, 1)).toBeCloseTo(0.65);
      expect(prob(output, 2)).toBeCloseTo(0.05);
    });

    it('uses a die as the target defense', () => {
      const output = one(`
        MISS: 0
        HIT: 1
        CRITICALHIT: 2

        function: attack ROLL:n vs DEFENSE:n {
          if ROLL = 1 { result: MISS }
          if ROLL = 20 {
            if ROLL + ATTACK >= DEFENSE { result: CRITICALHIT }
            result: HIT
          }
          if ROLL + ATTACK >= DEFENSE { result: HIT }
          result: MISS
        }

        ATTACK: 5 + 3
        output [attack d20 vs d{5..30}]
      `);
      expect(prob(output, 0)).toBeCloseTo(0.4481, 3);
      expect(prob(output, 1)).toBeCloseTo(0.5057, 3);
      expect(prob(output, 2)).toBeCloseTo(0.0462, 3);
    });

    it('combines hit results with damage', () => {
      const output = one(`
        function: attack ROLL:n vs DEFENSE:n {
          if ROLL = 1 { result: MISS }
          if ROLL = 20 {
            if ROLL + ATTACK >= DEFENSE { result: CRITICALHIT }
            result: HIT
          }
          if ROLL + ATTACK >= DEFENSE { result: HIT }
          result: MISS
        }

        function: damage for ATTACKRESULT:n {
          if ATTACKRESULT = CRITICALHIT { result: CRITICALDAMAGE }
          if ATTACKRESULT = HIT { result: HITDAMAGE }
          result: MISSDAMAGE
        }

        MISS: 0
        HIT: 1
        CRITICALHIT: 2
        ATTACK: 5 + 3
        HITDAMAGE: d10 + 4
        CRITICALDAMAGE: 14
        MISSDAMAGE: 0
        output [damage for [attack d20 vs d{10..30}]]
      `);
      expect(output.mean).toBeCloseTo(4.55, 1);
    });
  });

  describe('D&D 3 Attacks', () => {
    it('confirms critical threats with a second d20', () => {
      const output = one(`
        AC: 15
        STRENGTH: 3
        ATTACK: 1 + STRENGTH
        DAMAGE: 1
        THREAT: 20
        CRITICAL: 2

        function: ROLL:n vs AC:n {
          if ROLL >= THREAT & ROLL + ATTACK >= AC {
            result: [threat d20]
          }
          if ROLL + ATTACK >= AC | ROLL = 20 { result: DAMAGE }
          result: 0
        }

        function: threat ROLL:n {
          if ROLL + ATTACK >= AC | ROLL = 20 {
            result: CRITICAL d DAMAGE
          }
          result: DAMAGE
        }

        output [d20 vs AC]
      `);
      expectRange(output, 0, 2);
      expect(prob(output, 0)).toBeCloseTo(0.5);
      expect(prob(output, 1)).toBeCloseTo(0.475);
      expect(prob(output, 2)).toBeCloseTo(0.025);
    });
  });

  describe('Exalted 2', () => {
    it('turns a d10 into botch, failure and success results', () => {
      const output = one(`
        function: evaluate ROLL:s {
          SUCCESSES: ROLL >= 7
          if SUCCESSES > 0 {
            result: SUCCESSES + (ROLL = 10)
          }
          if (#ROLL)@ROLL = 1 {
            result: -1
          }
          result: 0
        }
        output [evaluate 1d10]
      `);
      expect(prob(output, -1)).toBeCloseTo(0.1);
      expect(prob(output, 0)).toBeCloseTo(0.5);
      expect(prob(output, 1)).toBeCloseTo(0.3);
      expect(prob(output, 2)).toBeCloseTo(0.1);
    });

    it('clamps results for the success/failure/botch view', () => {
      const output = one(`
        function: evaluate ROLL:s {
          SUCCESSES: ROLL >= 7
          if SUCCESSES > 0 {
            result: SUCCESSES + (ROLL = 10)
          }
          if (#ROLL)@ROLL = 1 { result: -1 }
          result: 0
        }
        output [lowest of [evaluate 4d10] and 1]
      `);
      expectRange(output, -1, 1);
    });
  });

  describe('Exploding Dice', () => {
    it('explodes a d4 up to the configured depth', () => {
      const output = one(`
        set "explode depth" to 1
        output [explode d4]
      `);
      expectRange(output, 1, 8);
      for (const value of [1, 2, 3]) {
        expect(prob(output, value)).toBeCloseTo(0.25);
      }
      for (const value of [5, 6, 7, 8]) {
        expect(prob(output, value)).toBeCloseTo(1 / 16);
      }
    });

    it('sums independently exploded dice', () => {
      const together = one(`
        set "explode depth" to 2
        output 2d[explode d4]
      `);
      const separately = one(`
        set "explode depth" to 2
        output [explode d4] + [explode d4]
      `);
      expect(together.outcomes).toEqual(separately.outcomes);
    });
  });

  describe('Interpolating Distributions', () => {
    it('mixes two mechanics with a die-to-number parameter', () => {
      const mixed = one(`
        function: switch S:n {
          if S { result: d20 }
          result: 2@3d20
        }
        output [switch d4 <= 3]
      `);
      const flat = one('output d20');
      const curved = one('output 2@3d20');

      const expected = new Map<number, number>();
      for (const outcome of flat.outcomes) {
        expected.set(
          outcome.value,
          (expected.get(outcome.value) ?? 0) + outcome.probability * 0.75,
        );
      }
      for (const outcome of curved.outcomes) {
        expected.set(
          outcome.value,
          (expected.get(outcome.value) ?? 0) + outcome.probability * 0.25,
        );
      }

      for (const [value, probability] of expected) {
        expect(prob(mixed, value)).toBeCloseTo(probability, 10);
      }
    });
  });

  describe('Legend of the Five Rings', () => {
    it('supports a roll-and-keep function whose name contains parameters', () => {
      const output = one(`
        function: convert SUM:n {
          if SUM >= 1000 {
            TENS: SUM / 1000
            result: SUM - TENS * 990 + TENS d [explode d10]
          }
          result: SUM
        }

        function: ROLL_SIZE:n k KEEP_SIZE:n {
          result: [convert [highest KEEP_SIZE of ROLL_SIZE d{1..9, 1000}]]
        }

        output [6k3]
      `);
      expect(output.outcomes[0].value).toBeGreaterThanOrEqual(3);
      expect(output.outcomes[output.outcomes.length - 1].value).toBeGreaterThan(
        30,
      );
    });

    it('compares a plain 6k3 pool', () => {
      const output = one('output [highest 3 of 6d10]');
      expectRange(output, 3, 30);
    });
  });

  describe('New World of Darkness', () => {
    const nwod = `
      function: nwod R:n again N:n {
        if N >= R { result: 1 + [nwod R again d10] }
        result: N >= 8
      }
    `;

    it('counts 8s and 9s as one success without rerolls', () => {
      const output = one(`${nwod} output [nwod 11 again d10]`);
      expect(prob(output, 0)).toBeCloseTo(0.7);
      expect(prob(output, 1)).toBeCloseTo(0.3);
    });

    it('rerolls and adds on a 10', () => {
      const output = one(`${nwod} output [nwod 10 again d10]`);
      expect(output.mean).toBeCloseTo(1 / 3, 5);
      expect(atLeast(output, 2)).toBeGreaterThan(0);
    });

    it('caps a pool at ten successes', () => {
      const output = one(`
        ${nwod}
        NWOD: [nwod 10 again d10]
        output [lowest of 10 and 10dNWOD]
      `);
      expectRange(output, 0, 10);
    });
  });

  describe('Qin', () => {
    it('computes margins from yin-yang dice', () => {
      const success = one(`
        function: qin MODIFIER vs TARGET {
          result: [roll 2d{0..9}]
        }

        function: roll YY:s {
          if 1@YY = 2@YY { result: 1@YY }
          result: [highest of 0 and 1@YY - 2@YY + MODIFIER - TARGET]
        }

        output [qin 1 vs 5] > 0
      `);
      expect(prob(success, 1)).toBeCloseTo(0.39);
    });
  });

  describe('Rolling Within a Range', () => {
    it('finds six ways to roll 1-100', () => {
      const result = outputs(`
        loop X over {1,3,9,11,33,99} {
          Y: 1 + 99 / X
          Z: X - 1
          output XdY - Z named "[X]d[Y] - [Z]"
        }
      `);
      expect(result).toHaveLength(6);
      for (const output of result) {
        expectRange(output, 1, 100);
      }
    });

    it('uses divisibility checks to enumerate 1-19', () => {
      const result = outputs(`
        N: 19
        loop X over {1..N - 1} {
          if ((N - 1) / X) * X = N - 1 {
            Y: 1 + (N - 1) / X
            Z: X - 1
            output XdY - Z named "[X]d[Y] - [Z]"
          }
        }
      `);
      expect(result).toHaveLength(6);
      for (const output of result) {
        expectRange(output, 1, 19);
      }
    });
  });

  describe('The Pool', () => {
    it('computes success rates for pools of one to ten dice', () => {
      const result = outputs(`
        loop DICE over {1..10} {
          output DICE d (d6 = 1) > 0 named "[DICE]d"
        }
      `);
      expect(result).toHaveLength(10);
      const byName = new Map(result.map((output) => [output.name, output]));
      const expected = [
        1 / 6,
        11 / 36,
        0.4213,
        0.5177,
        0.5981,
        0.6651,
        0.7209,
        0.7674,
        0.8062,
        0.8385,
      ];
      expected.forEach((probability, index) => {
        const output = byName.get(`${index + 1}d`);
        expect(output).toBeDefined();
        expect(prob(output!, 1)).toBeCloseTo(probability, 3);
      });
    });
  });

  describe('The Questing Beast', () => {
    const questingBeast = `
      function: interpret ROLL:s {
        if (#ROLL)@ROLL = 1 { result: 1 }
        if 1@ROLL = 6 { result: -1 }
        result: 0
      }
    `;

    it('classifies a single d6', () => {
      const output = one(`${questingBeast} output [interpret 1d6]`);
      expect(prob(output, 1)).toBeCloseTo(1 / 6);
      expect(prob(output, -1)).toBeCloseTo(1 / 6);
      expect(prob(output, 0)).toBeCloseTo(4 / 6);
    });

    it('classifies a two-die pool', () => {
      const output = one(`${questingBeast} output [interpret 2d6]`);
      expect(prob(output, 1)).toBeCloseTo(11 / 36);
      expect(prob(output, -1)).toBeCloseTo(0.25);
      expect(prob(output, 0)).toBeCloseTo(4 / 9);
    });
  });

  describe('Three Basic Distributions', () => {
    it('has a single point for zero dice', () => {
      const output = one('output 0d10');
      expect(output.outcomes).toEqual([
        { value: 0, weight: 1n, probability: 1 },
      ]);
    });

    it('has a flat one-die distribution', () => {
      const output = one('output 1d10');
      expect(output.outcomes).toHaveLength(10);
      for (const outcome of output.outcomes) {
        expect(outcome.probability).toBeCloseTo(0.1);
      }
    });

    it('has a pyramid two-die distribution', () => {
      const output = one('output 2d10');
      expectRange(output, 2, 20);
      expect(prob(output, 2)).toBeCloseTo(0.01);
      expect(prob(output, 7)).toBeCloseTo(0.06);
      expect(prob(output, 11)).toBeCloseTo(0.1);
      expect(prob(output, 20)).toBeCloseTo(0.01);
    });

    it('has a symmetric difference distribution', () => {
      const output = one('output 1d10 - 1d10');
      expectRange(output, -9, 9);
      expect(output.mean).toBeCloseTo(0);
      for (let value = 1; value <= 9; value++) {
        expect(prob(output, value)).toBeCloseTo(prob(output, -value));
      }
    });
  });
});
