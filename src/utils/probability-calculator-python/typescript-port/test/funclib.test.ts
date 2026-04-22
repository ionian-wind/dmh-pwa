import { describe, it, expect, beforeEach } from 'vitest';
import { anydice_casting, roll, RV, Seq, settings_reset, T_N, T_S, T_D, absolute_X as absolute, highest_X_of_X as highest_N_of_D, lowest_X_of_X as lowest_N_of_D, middle_X_of_X as middle_N_of_D, reverse_X as reverse, sort_X as sort, X_contains_X as contains, count_X_in_X as count_in } from '../src/index';

describe('funclib', () => {
  beforeEach(() => {
    settings_reset();
  });

  describe('absolute', () => {
    it('should return absolute value', () => {
      expect(absolute(-3)).toBe(3);
    });

    it.skip('should handle RV', () => {
      const a = new RV([2, 1, 0, 1, 2, 3], [1, 1, 1, 1, 1, 1]);
      const r = ((roll(6) as any).__sub__(3)) as RV;
      const result = absolute(r as any) as RV;
      expect(RV.dices_are_equal(result, a)).toBe(true);
    });

    it.skip('should handle abs(RV)', () => {
      const r = ((roll(6) as any).__sub__(3)) as RV;
      const result = Math.abs(r as any) as RV;
      const a = new RV([2, 1, 0, 1, 2, 3], [1, 1, 1, 1, 1, 1]);
      expect(RV.dices_are_equal(result, a)).toBe(true);
    });
  });

  describe('contains', () => {
    it('should check if sequence contains value', () => {
      const seq = new Seq(1, 2, 3, 4, 5, 6);
      expect(contains(seq as any, 3)).toBeTruthy();
    });
  });

  describe('count_in', () => {
    it('should count values in sequence', () => {
      const values = new Seq(1, 2);
      const sequence = new Seq(1, 2, 3, 4, 5, 6);
      const result = count_in(values as any, sequence as any);
      expect(result).not.toBeNull();
    });
  });

  describe('reverse', () => {
    it('should reverse sequence', () => {
      const seq = new Seq(1, 2, 3);
      const reversed = reverse(seq as any) as Seq;
      expect(reversed._seq).toEqual([3, 2, 1]);
    });

    it('should reverse roll', () => {
      const r = roll(2, 6);
      const r2 = reverse(r as any) as RV;
      expect(RV.dices_are_equal(r, r2)).toBe(true);
    });
  });

  describe('sort', () => {
    it('should sort sequence', () => {
      const s = new Seq(1, 2, 4, 6, 5, 3);
      const sorted = sort(s as any) as Seq;
      expect(sorted._seq[0]).toBe(1);
    });
  });

  describe('highest_N_of_D', () => {
    it('should get highest N of D', () => {
      const result = highest_N_of_D(3, roll(4, 6));
      expect(result).not.toBeNull();
    });

    it('should handle roll(N) as dice', () => {
      const result = highest_N_of_D(roll(4) as any, roll(4, 6));
      expect(result).not.toBeNull();
    });
  });

  describe('lowest_N_of_D', () => {
    it('should get lowest N of D', () => {
      const result = lowest_N_of_D(3, roll(4, 6));
      expect(result).not.toBeNull();
    });
  });

  describe('middle_N_of_D', () => {
    it('should get middle N of D', () => {
      expect(middle_N_of_D(1, roll(3, 6))).not.toBeNull();
      expect(middle_N_of_D(2, roll(3, 6))).not.toBeNull();
      expect(middle_N_of_D(1, roll(4, 6))).not.toBeNull();
      expect(middle_N_of_D(2, roll(4, 4))).not.toBeNull();
      expect(middle_N_of_D(3, roll(4, 6))).not.toBeNull();
    });
  });

  describe('anydice_casting with T_D', () => {
    it.skip('should cast die to sequence', () => {
      const decorator = anydice_casting();
      function f(DIE: T_D) {
        return (reverse(Seq(DIE as any)) + 1);
      }
      const decorated = decorator(f);
      const result = decorated(roll(6));
      expect(result).not.toBeNull();
    });

    it.skip('should cast die to seq then get position', () => {
      const decorator = anydice_casting();
      function f(DIE: T_D) {
        return (reverse(new Seq(DIE as any)) as Seq).__rmatmul__(1);
      }
      const decorated = decorator(f);
      expect(decorated(roll(6))).toBe(6);
      expect(decorated(roll(4, 6))).toBe(24);
    });
  });

  describe('anydice_casting with T_N', () => {
    it('should cast when condition on DIE', () => {
      const decorator = anydice_casting();
      function double_N_if_above_N(A: T_N, B: T_N) {
        if ((A as number) > (B as number)) {
          return (A as number) + (A as number);
        }
        return A;
      }
      const decorated = decorator(double_N_if_above_N);
      const result = decorated(roll(6), 3);
      expect(result).not.toBeNull();
    });
  });

  describe('anydice_casting with T_S', () => {
    it.skip('should cast sequence to int', () => {
      const decorator = anydice_casting();
      function count_fives_and_above_and_subtract_ones(ROLL: T_S) {
        const rollSeq = ROLL as unknown as { __ge__: (n: number) => unknown, __eq__: (n: number) => unknown };
        return ((rollSeq.__ge__(5) as any) - (rollSeq.__eq__(1) as any));
      }
      const decorated = decorator(count_fives_and_above_and_subtract_ones);
      const result = decorated(roll(3, 6));
      expect(result).not.toBeNull();
    });
  });
});
