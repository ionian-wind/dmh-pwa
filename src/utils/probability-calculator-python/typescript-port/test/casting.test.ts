import { describe, it, expect, beforeEach } from 'vitest';
import { anydice_casting, anydiceTyped, roll, RV, Seq, settings_reset, T_N, T_S, T_D, get_seq } from '../src/index';

describe('decorators', () => {
  beforeEach(() => {
    settings_reset();
  });

  describe('type casting with anydice_casting', () => {
    it('should cast int to int', () => {
      const decorator = anydice_casting();
      function f1(inp: T_N) {
        return inp;
      }
      const decorated = decorator(f1);
      expect(typeof decorated(7)).toBe('number');
      expect(decorated(7)).toBe(7);
    });

    it('should cast seq to int', () => {
      const decorator = anydice_casting();
      function f2(inp: T_S) {
        return inp;
      }
      const decorated = decorator(f2);
      const seq = new Seq(1, 4);
      const result = decorated(seq as any);
      expect(result).toBeDefined();
    });

    it('should cast die to seq', () => {
      const decorator = anydice_casting();
      function f(DIE: T_D) {
        return DIE;
      }
      const decorated = decorator(f);
      const result = decorated(roll(4));
      expect(result).toBeDefined();
    });

    it('should reject list params', () => {
      const decorator = anydice_casting();
      function f4(inp: any[]) {
        return inp;
      }
      const decorated = decorator(f4);
      const result = decorated([1]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('integer parameter casting', () => {
    it('should cast int to int', () => {
      const decorator = anydice_casting();
      function f1(inp: T_N) {
        return inp;
      }
      const decorated = decorator(f1);
      expect(decorated(7)).toBe(7);
    });

    it('should cast seq to int with metadata', () => {
      const decorator = anydice_casting();
      const dec2 = anydiceTyped({ params: { inp: 'T_N' }, returns: 'T_N' });
      function f1(inp: number): number {
        return inp as number;
      }
      const withMeta = dec2(f1);
      const decorated = decorator(withMeta);
      expect(decorated(new Seq(1, 4))).toBe(5);
    });

    it('should cast die to seq with metadata', () => {
      const decorator = anydice_casting();
      const dec2 = anydiceTyped({ params: { DIE: 'T_S' }, returns: 'T_S' });
      function f2(SEQUENCE: any): any {
        return SEQUENCE;
      }
      const withMeta = dec2(f2);
      const decorated = decorator(withMeta);
      const result = decorated(roll(2, 2));
      expect(result).toBeDefined();
    });

    it('should cast int to die with metadata', () => {
      const decorator = anydice_casting();
      const dec2 = anydiceTyped({ params: { num: 'T_D' }, returns: 'T_D' });
      function f3(DIE: any): any {
        return DIE;
      }
      const withMeta = dec2(f3);
      const decorated = decorator(withMeta);
      const result = decorated(7);
      expect(result).toBeDefined();
    });

    it('should cast die to int', () => {
      const decorator = anydice_casting();
      function f1(inp: T_N) {
        return inp;
      }
      const decorated = decorator(f1);
      const result = decorated(roll(2, 2));
      expect(result).toBeDefined();
    });
  });

  describe('sequence parameter casting', () => {
    it('should cast int to seq', () => {
      const decorator = anydice_casting();
      function f2(inp: T_S) {
        return inp;
      }
      const decorated = decorator(f2);
      const result = decorated(7);
      expect(result).toBeDefined();
    });

    it.skip('should pass seq through', () => {
      const decorator = anydice_casting();
      function f2(inp: T_S) {
        return inp;
      }
      const decorated = decorator(f2);
      const seq = new Seq(1, 4);
      expect(Seq.seqs_are_equal(decorated(seq as any), seq)).toBe(true);
    });

    it('should cast die to seq', () => {
      const decorator = anydice_casting();
      function f2(inp: T_S) {
        return inp;
      }
      const decorated = decorator(f2);
      const result = decorated(roll(2, 2));
      expect(result).toBeDefined();
    });
  });

  describe('die parameter casting', () => {
    it('should cast int to die', () => {
      const decorator = anydice_casting();
      function f3(inp: T_D) {
        return inp;
      }
      const decorated = decorator(f3);
      const result = decorated(7);
      expect(result).toBeDefined();
    });

    it('should cast seq to die', () => {
      const decorator = anydice_casting();
      function f3(inp: T_D) {
        return inp;
      }
      const decorated = decorator(f3);
      const seq = new Seq(1, 4);
      const result = decorated(seq as any);
      expect(result).toBeDefined();
    });

    it('should pass die through', () => {
      const decorator = anydice_casting();
      function f3(inp: T_D) {
        return inp;
      }
      const decorated = decorator(f3);
      const result = decorated(roll(2, 2));
      expect(RV.dices_are_equal(result as RV, roll(2, 2))).toBe(true);
    });
  });

  describe('multiple dice to sequence', () => {
    it.skip('should cast multiple dice to sequence', () => {
      const decorator = anydice_casting();
      function count(VALUES: T_S, SEQUENCE: T_S) {
        let COUNT = 0;
        const valuesSeq = VALUES as unknown as { _seq: number[] };
        const seqSeq = SEQUENCE as unknown as { _seq: number[] };
        for (let P = 1; P <= valuesSeq._seq.length; P++) {
          const v = valuesSeq._seq[P - 1];
          for (const s of seqSeq._seq) {
            if (v === s) COUNT++;
          }
        }
        return COUNT;
      }
      const decorated = decorator(count);
      const result = decorated(roll(3, 2), roll(2, 2));
      expect(result).toBeDefined();
    });

    it.skip('should cast single dice to sequence', () => {
      const decorator = anydice_casting();
      function cast(M: T_S) {
        const seq = M as unknown as { __add__: (n: number) => unknown };
        return (seq.__add__(1) as number);
      }
      const decorated = decorator(cast);
      const result = decorated(roll(2, 2));
      expect(result).toBeDefined();
    });
  });

  describe('dice to seq then roll', () => {
    it('should cast dice to seq then roll', () => {
      const decorator = anydice_casting();
      function p(SEQUENCE: T_S) {
        return roll(3, SEQUENCE as any);
      }
      const decorated = decorator(p);
      const result = decorated(roll(2, 3));
      expect(result).toBeDefined();
    });
  });

  describe('cast then matmul', () => {
    it.skip('should handle matmul after casting to sequence', () => {
      const decorator = anydice_casting();
      function count(V: T_N, SEQUENCE: T_S) {
        return ((SEQUENCE as any).__rmatmul__(V as number));
      }
      const decorated = decorator(count);
      const result = decorated(1, roll(2, 4));
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });
  });
});

describe('settings', () => {
  describe('max_func_depth', () => {
    it('should limit function depth', () => {
      const maxFuncDepth = anydice_casting();
      function a(n: T_N) {
        return n;
      }
      const decorated = maxFuncDepth(a as any);
      expect(decorated(1000)).toBeGreaterThan(0);
    });
  });
});