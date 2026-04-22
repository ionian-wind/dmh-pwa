import { describe, it, expect, beforeEach } from 'vitest';
import { Seq, RV, roll, settings_reset } from '../src/index';

describe('Seq', () => {
  beforeEach(() => {
    settings_reset();
  });

  it('should handle @ operator with num', () => {
    const seq = new Seq(2, 3);
    const r = seq.__matmul__(1234);
    expect(typeof r).toBe('number');
    expect(r).toBe(5);
  });

  it('should handle SEQ @ SEQ', () => {
    const testCases = [
      { l1: [2], l2: [1, 2, 3], expected: 2 },
      { l1: [1, 2], l2: [2, 3, 999, 999], expected: 5 },
      { l1: [-1000, 2, 2, 1000], l2: [2, 3, 4, 5], expected: 6 },
      { l1: [1, 3], l2: [2, 4, 6], expected: 8 },
      { l1: [1, 2, 2], l2: [2, 4, 6], expected: 10 },
    ];

    testCases.forEach(({ l1, l2, expected }) => {
      const seq1 = new Seq(...l1);
      const seq2 = new Seq(...l2);
      const result = seq1.__matmul__(seq2);
      expect(result).toBe(expected);
    });
  });

  it('should handle N @ SEQ', () => {
    const testCases = [
      { n: 1, l2: [2, 4, 6], expected: 2 },
      { n: 3, l2: [2, 4, 6], expected: 6 },
    ];

    testCases.forEach(({ n, l2, expected }) => {
      const seq = new Seq(...l2);
      const result = seq.__rmatmul__(n);
      expect(result).toBe(expected);
    });
  });

  it('should handle arithmetic operations', () => {
    const params = [
      [4, 4, 3, 3],
      [4, 4, 10, 10],
      [[4], 4, 10, 10],
      [[2, 2], 4, 10, 10],
      [4, 4, [10], 10],
      [4, 4, [2, 8], 10],
      [[4], 4, [10], 10],
      [[1, 3], 4, [10], 10],
      [[1, 3], 4, [5, 5], 10],
      [[1, 3], 4, [1, 4, 5], 10],
      [[1, 3], 4, [1, [2, 2], 5], 10],
      [[1, [1, 2]], 4, [1, [2, [1, 1], 1], 4], 10],
      [4, 4, [1, [2, [1, 1], 1], 4], 10],
      [[1, [1, 2]], 4, 10, 10],
    ];

    const getSeq = (v: number | number[]) => Array.isArray(v) ? new Seq(...v) : v;

    params.forEach(([s1, t1, s2, t2]) => {
      let s1a: any = Array.isArray(s1) ? new Seq(...s1) : s1;
      let s2a: any = Array.isArray(s2) ? new Seq(...s2) : s2;
      // If not a Seq, wrap in Seq
      if (typeof s1a === 'number') s1a = new Seq(s1a);
      if (typeof s2a === 'number') s2a = new Seq(s2a);
      const r1 = (s1a as any).__add__(s2a);
      const r2 = (s2a as any).__add__(s1a);
      expect(r1).toBe((t1 as number) + (t2 as number));
      expect(r2).toBe((t2 as number) + (t1 as number));
    });
  });

  it('should handle subtraction operations', () => {
    const params = [
      [4, 4, 3, 3],
      [4, 4, 10, 10],
      [[4], 4, 10, 10],
      [[2, 2], 4, 10, 10],
      [4, 4, [10], 10],
      [4, 4, [2, 8], 10],
      [[4], 4, [10], 10],
      [[1, 3], 4, [10], 10],
      [[1, 3], 4, [5, 5], 10],
      [[1, 3], 4, [1, 4, 5], 10],
      [[1, 3], 4, [1, [2, 2], 5], 10],
      [[1, [1, 2]], 4, [1, [2, [1, 1], 1], 4], 10],
      [4, 4, [1, [2, [1, 1], 1], 4], 10],
      [[1, [1, 2]], 4, 10, 10],
    ];

    params.forEach(([s1, t1, s2, t2]) => {
      let s1a: any = Array.isArray(s1) ? new Seq(...s1) : s1;
      let s2a: any = Array.isArray(s2) ? new Seq(...s2) : s2;
      if (typeof s1a === 'number') s1a = new Seq(s1a);
      if (typeof s2a === 'number') s2a = new Seq(s2a);
      const r1 = (s1a as any).__sub__(s2a);
      const r2 = (s2a as any).__sub__(s1a);
      expect(r1).toBe((t1 as number) - (t2 as number));
      expect(r2).toBe((t2 as number) - (t1 as number));
    });
  });

  it('should handle multiplication operations', () => {
    const params = [
      [4, 4, 3, 3],
      [4, 4, 10, 10],
      [[4], 4, 10, 10],
      [[2, 2], 4, 10, 10],
      [4, 4, [10], 10],
      [4, 4, [2, 8], 10],
      [[4], 4, [10], 10],
      [[1, 3], 4, [10], 10],
      [[1, 3], 4, [5, 5], 10],
      [[1, 3], 4, [1, 4, 5], 10],
      [[1, 3], 4, [1, [2, 2], 5], 10],
      [[1, [1, 2]], 4, [1, [2, [1, 1], 1], 4], 10],
      [4, 4, [1, [2, [1, 1], 1], 4], 10],
      [[1, [1, 2]], 4, 10, 10],
    ];

    params.forEach(([s1, t1, s2, t2]) => {
      let s1a: any = Array.isArray(s1) ? new Seq(...s1) : s1;
      let s2a: any = Array.isArray(s2) ? new Seq(...s2) : s2;
      if (typeof s1a === 'number') s1a = new Seq(s1a);
      if (typeof s2a === 'number') s2a = new Seq(s2a);
      const r1 = (s1a as any).__mul__(s2a);
      const r2 = (s2a as any).__mul__(s1a);
      expect(r1).toBe((t1 as number) * (t2 as number));
      expect(r2).toBe((t2 as number) * (t1 as number));
    });
  });

  it('should handle division operations', () => {
    const params = [
      [4, 4, 3, 3],
      [4, 4, 10, 10],
      [[4], 4, 10, 10],
      [[2, 2], 4, 10, 10],
      [4, 4, [10], 10],
      [4, 4, [2, 8], 10],
      [[4], 4, [10], 10],
      [[1, 3], 4, [10], 10],
      [[1, 3], 4, [5, 5], 10],
      [[1, 3], 4, [1, 4, 5], 10],
      [[1, 3], 4, [1, [2, 2], 5], 10],
      [[1, [1, 2]], 4, [1, [2, [1, 1], 1], 4], 10],
      [4, 4, [1, [2, [1, 1], 1], 4], 10],
      [[1, [1, 2]], 4, 10, 10],
    ];

    params.forEach(([s1, t1, s2, t2]) => {
      let s1a: any = Array.isArray(s1) ? new Seq(...s1) : s1;
      let s2a: any = Array.isArray(s2) ? new Seq(...s2) : s2;
      if (typeof s1a === 'number') s1a = new Seq(s1a);
      if (typeof s2a === 'number') s2a = new Seq(s2a);
      const r1 = (s1a as any).__truediv__(s2a);
      const r2 = (s2a as any).__truediv__(s1a);
      expect(r1).toBe((t1 as number) / (t2 as number));
      expect(r2).toBe((t2 as number) / (t1 as number));
    });
  });

  it('should handle floor division operations', () => {
    const params = [
      [4, 4, 3, 3],
      [4, 4, 10, 10],
      [[4], 4, 10, 10],
      [[2, 2], 4, 10, 10],
      [4, 4, [10], 10],
      [4, 4, [2, 8], 10],
      [[4], 4, [10], 10],
      [[1, 3], 4, [10], 10],
      [[1, 3], 4, [5, 5], 10],
      [[1, 3], 4, [1, 4, 5], 10],
      [[1, 3], 4, [1, [2, 2], 5], 10],
      [[1, [1, 2]], 4, [1, [2, [1, 1], 1], 4], 10],
      [4, 4, [1, [2, [1, 1], 1], 4], 10],
      [[1, [1, 2]], 4, 10, 10],
    ];

    params.forEach(([s1, t1, s2, t2]) => {
      let s1a: any = Array.isArray(s1) ? new Seq(...s1) : s1;
      let s2a: any = Array.isArray(s2) ? new Seq(...s2) : s2;
      if (typeof s1a === 'number') s1a = new Seq(s1a);
      if (typeof s2a === 'number') s2a = new Seq(s2a);
      const r1 = (s1a as any).__floordiv__(s2a);
      const r2 = (s2a as any).__floordiv__(s1a);
      expect(r1).toBe(Math.floor((t1 as number) / (t2 as number)));
      expect(r2).toBe(Math.floor((t2 as number) / (t1 as number)));
    });
  });

  it('should handle power operations', () => {
    const params = [
      [4, 4, 3, 3],
      [4, 4, 10, 10],
      [[4], 4, 10, 10],
      [[2, 2], 4, 10, 10],
      [4, 4, [10], 10],
      [4, 4, [2, 8], 10],
      [[4], 4, [10], 10],
      [[1, 3], 4, [10], 10],
      [[1, 3], 4, [5, 5], 10],
      [[1, 3], 4, [1, 4, 5], 10],
      [[1, 3], 4, [1, [2, 2], 5], 10],
      [[1, [1, 2]], 4, [1, [2, [1, 1], 1], 4], 10],
      [4, 4, [1, [2, [1, 1], 1], 4], 10],
      [[1, [1, 2]], 4, 10, 10],
    ];

    params.forEach(([s1, t1, s2, t2]) => {
      let s1a: any = Array.isArray(s1) ? new Seq(...s1) : s1;
      let s2a: any = Array.isArray(s2) ? new Seq(...s2) : s2;
      if (typeof s1a === 'number') s1a = new Seq(s1a);
      if (typeof s2a === 'number') s2a = new Seq(s2a);
      const r1 = (s1a as any).__pow__(s2a);
      const r2 = (s2a as any).__pow__(s1a);
      expect(r1).toBe(Math.pow((t1 as number), (t2 as number)));
      expect(r2).toBe(Math.pow((t2 as number), (t1 as number)));
    });
  });

  it('should handle modulo operations', () => {
    const params = [
      [4, 4, 3, 3],
      [4, 4, 10, 10],
      [[4], 4, 10, 10],
      [[2, 2], 4, 10, 10],
      [4, 4, [10], 10],
      [4, 4, [2, 8], 10],
      [[4], 4, [10], 10],
      [[1, 3], 4, [10], 10],
      [[1, 3], 4, [5, 5], 10],
      [[1, 3], 4, [1, 4, 5], 10],
      [[1, 3], 4, [1, [2, 2], 5], 10],
      [[1, [1, 2]], 4, [1, [2, [1, 1], 1], 4], 10],
      [4, 4, [1, [2, [1, 1], 1], 4], 10],
      [[1, [1, 2]], 4, 10, 10],
    ];

    params.forEach(([s1, t1, s2, t2]) => {
      let s1a: any = Array.isArray(s1) ? new Seq(...s1) : s1;
      let s2a: any = Array.isArray(s2) ? new Seq(...s2) : s2;
      if (typeof s1a === 'number') s1a = new Seq(s1a);
      if (typeof s2a === 'number') s2a = new Seq(s2a);
      const r1 = (s1a as any).__mod__(s2a);
      const r2 = (s2a as any).__mod__(s1a);
      expect(r1).toBe((t1 as number) % (t2 as number));
      expect(r2).toBe((t2 as number) % (t1 as number));
    });
  });

  it('should handle > comparison', () => {
    const tests = [
      { l1: [1, 2], l2: [1, 2], expected: false },
      { l1: [1, 2], l2: [1, 2, 3], expected: false },
      { l1: [1, 2], l2: [1, 1], expected: false },
      { l1: [1, 2], l2: [1], expected: false },
      { l1: [1, 2], l2: [0, 1], expected: true },
      { l1: [2, 2], l2: [1], expected: true },
    ];

    tests.forEach(({ l1, l2, expected }) => {
      const result = (new Seq(...l1) as any).__gt__(new Seq(...l2));
      expect(result).toBe(expected ? 1 : 0);
    });
  });

  it('should handle >= comparison', () => {
    const tests = [
      { l1: [1, 2], l2: [1, 2], expected: true },
      { l1: [1, 2], l2: [1, 2, 3], expected: false },
      { l1: [1, 2], l2: [1, 1], expected: true },
      { l1: [1, 2], l2: [1], expected: true },
      { l1: [1, 2], l2: [0, 1], expected: true },
      { l1: [2, 2], l2: [1], expected: true },
      { l1: [1, 3], l2: [1, 2], expected: true },
      { l1: [2, 2], l2: [1], expected: true },
      { l1: [1], l2: [1, 2], expected: false },
    ];

    tests.forEach(({ l1, l2, expected }) => {
      const result = (new Seq(...l1) as any).__ge__(new Seq(...l2));
      expect(result).toBe(expected ? 1 : 0);
    });
  });

  it('should handle < comparison', () => {
    const tests = [
      { l1: [0], l2: [1, 2], expected: true },
      { l1: [0, 1], l2: [1, 2, 3], expected: true },
      { l1: [0, 0], l2: [1], expected: false },
      { l1: [1, 2], l2: [1, 2], expected: false },
      { l1: [1, 1], l2: [1, 2, 3], expected: false },
    ];

    tests.forEach(({ l1, l2, expected }) => {
      const result = (new Seq(...l1) as any).__lt__(new Seq(...l2));
      expect(result).toBe(expected ? 1 : 0);
    });
  });

  it('should handle <= comparison', () => {
    const tests = [
      { l1: [0], l2: [1, 2], expected: true },
      { l1: [1, 2], l2: [1, 2], expected: true },
      { l1: [1, 2, 3], l2: [1, 2], expected: false },
      { l1: [0, 1], l2: [1, 2, 3], expected: true },
      { l1: [0, 0], l2: [1], expected: false },
      { l1: [1, 1], l2: [1, 2, 3], expected: true },
      { l1: [1, 1], l2: [1, 2], expected: true },
      { l1: [1, 1], l2: [1], expected: false },
      { l1: [1, 2], l2: [0, 1], expected: false },
      { l1: [2, 2], l2: [1], expected: false },
      { l1: [1, 3], l2: [1, 2], expected: false },
      { l1: [2, 2], l2: [1], expected: false },
      { l1: [1], l2: [1, 2], expected: true },
    ];

    tests.forEach(({ l1, l2, expected }) => {
      const result = (new Seq(...l1) as any).__le__(new Seq(...l2));
      expect(result).toBe(expected ? 1 : 0);
    });
  });

  it('should handle comparison operations', () => {
    const eqTests = [
      { l1: [1, 2], l2: [1, 2], expected: true },
      { l1: [1], l2: [1], expected: true },
      { l1: [1, 1], l2: [1, 1], expected: true },
      { l1: [1, 1], l2: [1, 2], expected: false },
      { l1: [1, 1], l2: [1], expected: false },
      { l1: [1], l2: [1, 1], expected: false },
    ];

    eqTests.forEach(({ l1, l2, expected }) => {
      const eq = (new Seq(...l1) as any).__eq__(new Seq(...l2));
      expect(eq).toBe(expected ? 1 : 0);
    });

    const neTests = [
      { l1: [1, 2], l2: [2, 1], expected: true },
      { l1: [1], l2: [1, 1], expected: true },
      { l1: [1, 1], l2: [1, 1, 1], expected: true },
      { l1: [1, 1], l2: [1, 1], expected: false },
      { l1: [1, 1], l2: [1, 2], expected: true },
      { l1: [1, 1], l2: [1], expected: true },
    ];

    neTests.forEach(({ l1, l2, expected }) => {
      const ne = (new Seq(...l1) as any).__ne__(new Seq(...l2));
      expect(ne).toBe(expected ? 1 : 0);
    });
  });

  it('should create RV from seq', () => {
    const result = RV.from_seq(new Seq(2, roll(2, 2)));
    expect(RV.dices_are_equal(result, new RV([2, 3, 4], [2, 1, 1]))).toBe(true);
  });

  it.skip('should handle seq and rv operations', () => {
    const s = new Seq([1, 2, 5]);
    const r = roll(2, 6);
    expect(RV.dices_are_equal((s as any).__add__(r), new RV(Array.from({ length: 11 }, (_, i) => i + 10), [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]))).toBe(true);
    expect(RV.dices_are_equal((s as any).__gt__(r), new RV([0, 1], [5, 7]))).toBe(true);
    expect(RV.dices_are_equal((r as any).__lt__(s), new RV([0, 1], [5, 7]))).toBe(true);
  });
});
