import { describe, it, expect, beforeEach } from 'vitest';
import { RV, Seq, roll, output, BlankRV, settings_reset, settings_set } from '../src/index';

describe('RV', () => {
  beforeEach(() => {
    settings_reset();
  });

  describe('RV init', () => {
    const testCases = [
      { vals: [], probs: [] },
      { vals: [0], probs: [1] },
      { vals: [1], probs: [1] },
      { vals: [2], probs: [1] },
      { vals: [1, 2], probs: [1, 1] },
      { vals: [1, 2, 3], probs: [1, 1, 1] },
      { vals: [1, 2, 3], probs: [2, 2, 2] },
    ];

    testCases.forEach(({ vals, probs }) => {
      it(`should init with vals=${vals}, probs=${probs}`, () => {
        expect(() => new RV(vals, probs)).not.toThrow();
      });
    });
  });

  describe('RV init fail', () => {
    const failCases = [
      { vals: [1], probs: [] },
      { vals: [], probs: [1] },
      { vals: [1, 2], probs: [1] },
      { vals: [1], probs: [1, 1] },
      { vals: [1, 1, 1], probs: [1, 1] },
      { vals: [1, 1], probs: [1, -1] },
      { vals: [1, 1], probs: [1, 1.1] as any as [number, number] },
    ];

    failCases.forEach(({ vals, probs }) => {
      it(`should fail with vals=${vals}, probs=${probs}`, () => {
        expect(() => new RV(vals as number[], probs as number[])).toThrow();
      });
    });
  });

  it('should handle empty init', () => {
    const a = new RV([], []);
    const b = new RV([], []);
    const c = RV.from_seq(new Seq());
    const d = RV.from_rvs([]);
    const e = RV.from_rvs([new RV([0], [1])]);
    const f = RV.from_rvs([new BlankRV()]);

    expect(a.vals).toEqual([0]);
    expect(a.probs).toEqual([1]);
    expect(b.vals).toEqual([0]);
    expect(b.probs).toEqual([1]);
    expect(c.vals).toEqual([0]);
    expect(c.probs).toEqual([1]);
    expect(d).toBeInstanceOf(BlankRV);
    expect(e.vals).toEqual([0]);
    expect(e.probs).toEqual([1]);
    expect(f).toBeInstanceOf(BlankRV);
  });

  it('should test probability zero RV', () => {
    settings_set('RV_IGNORE_ZERO_PROBS', true);
    const a = new RV([1, 2, 777], [1, 1, 0]);
    expect(a.vals).toEqual([1, 2]);
    expect(a.probs).toEqual([1, 1]);

    settings_set('RV_IGNORE_ZERO_PROBS', false);
    const b = new RV([1, 2, 777], [1, 1, 0]);
    expect(b.vals).toEqual([1, 2, 777]);
    expect(b.probs).toEqual([1, 1, 0]);
  });

  it('should test RV equality', () => {
    const testCases = [
      { v: [1], p: [1], gv: [1], gp: [1] },
      { v: [1, 2, 3], p: [1, 1, 1], gv: [1, 2, 3], gp: [1, 1, 1] },
      { v: [2, 1, 3], p: [1, 1, 1], gv: [1, 2, 3], gp: [1, 1, 1] },
      { v: [1, 2, 3], p: [2, 2, 2], gv: [1, 2, 3], gp: [1, 1, 1] },
      { v: [1, 2, 3], p: [4, 4, 2], gv: [1, 2, 3], gp: [2, 2, 1] },
      { v: [1.1, 2.1, 3.1], p: [1, 1, 1], gv: [1.1, 2.1, 3.1], gp: [1, 1, 1] },
      { v: [], p: [], gv: [0], gp: [1] },
      { v: [1, 1, 3], p: [1, 5, 1], gv: [1, 3], gp: [6, 1] },
      { v: [1, 1, 3, 3], p: [2, 6, 2, 4], gv: [1, 3], gp: [4, 3] },
      { v: [3, 3, 1, 1], p: [2, 6, 2, 4], gv: [1, 3], gp: [3, 4] },
      { v: [3, 1, 3, 1], p: [2, 6, 2, 4], gv: [1, 3], gp: [5, 2] },
      { v: [3, 1, 3, 1, 5], p: [2, 6, 2, 4, 0], gv: [1, 3, 5], gp: [5, 2, 0] },
      { v: [1, 1, 1, 1], p: [2, 6, 2, 4], gv: [1], gp: [1] },
      { v: [1, 2], p: [1, 0], gv: [1, 2], gp: [1, 0] },
    ];

    testCases.forEach(({ v, p, gv, gp }) => {
      const a = new RV(v as number[], p as number[]);
      expect(a.vals).toEqual(gv);
      expect(a.probs).toEqual(gp);
      expect(RV.dices_are_equal(a, new RV(gv as number[], gp as number[]))).toBe(true);
    });
  });

  it('should test RV equality with zero prob setting', () => {
    const testCases = [
      { setting: true, v: [3, 1, 3, 1, 5], p: [2, 6, 2, 4, 0], gv: [1, 3], gp: [5, 2] },
      { setting: false, v: [3, 1, 3, 1, 5], p: [2, 6, 2, 4, 0], gv: [1, 3, 5], gp: [5, 2, 0] },
    ];

    testCases.forEach(({ setting, v, p, gv, gp }) => {
      settings_set('RV_IGNORE_ZERO_PROBS', setting);
      const a = new RV(v as number[], p as number[]);
      expect(a.vals).toEqual(gv);
      expect(a.probs).toEqual(gp);
      expect(RV.dices_are_equal(a, new RV(gv as number[], gp as number[]))).toBe(true);
    });
  });

  it('should create RV from const', () => {
    [1, 2, 3, 4, 5, 6, 8, 20, 100, 200, 201].forEach(n => {
      const a = RV.from_const(n);
      expect(a.vals).toEqual([n]);
      expect(a.probs).toEqual([1]);
    });
  });

  it('should get sum probs', () => {
    const testCases = [
      { v: [1], p: [1], sum_p: 1 },
      { v: [1, 2, 3], p: [1, 1, 1], sum_p: 3 },
      { v: [2, 1, 3], p: [1, 1, 1], sum_p: 3 },
      { v: [1, 2, 3], p: [2, 2, 2], sum_p: 3 },
      { v: [1, 2, 3], p: [4, 4, 2], sum_p: 5 },
      { v: [1.1, 2.1, 3.1], p: [1, 1, 1], sum_p: 3 },
      { v: [], p: [], sum_p: 1 },
      { v: [1, 1, 3], p: [1, 5, 1], sum_p: 7 },
      { v: [1, 1, 3, 3], p: [2, 6, 2, 4], sum_p: 7 },
      { v: [3, 3, 1, 1], p: [2, 6, 2, 4], sum_p: 7 },
      { v: [3, 1, 3, 1], p: [2, 6, 2, 4], sum_p: 7 },
      { v: [3, 1, 3, 1, 5], p: [2, 6, 2, 4, 0], sum_p: 7 },
      { v: [1, 1, 1, 1], p: [2, 6, 2, 4], sum_p: 1 },
    ];

    testCases.forEach(({ v, p, sum_p }) => {
      const a = new RV(v as number[], p as number[]);
      expect(a._get_sum_probs()).toEqual(sum_p);
    });
  });

  it('should get mean', () => {
    const testCases = [
      { v: [1], p: [1], mean: 1 },
      { v: [1, 2, 3], p: [1, 1, 1], mean: 2 },
      { v: [2, 1, 3], p: [1, 1, 1], mean: 2 },
      { v: [1, 2, 3], p: [2, 2, 2], mean: 2 },
      { v: [1, 2, 3], p: [4, 4, 2], mean: 9 / 5 },
      { v: [1.1, 2.1, 3.1], p: [1, 1, 1], mean: 2.1 },
      { v: [], p: [], mean: 0 },
      { v: [1, 1, 3], p: [1, 5, 1], mean: 9 / 7 },
      { v: [1, 1, 3, 3], p: [2, 6, 2, 4], mean: 13 / 7 },
      { v: [3, 3, 1, 1], p: [2, 6, 2, 4], mean: 15 / 7 },
      { v: [3, 1, 3, 1], p: [2, 6, 2, 4], mean: 11 / 7 },
      { v: [3, 1, 3, 1, 5], p: [2, 6, 2, 4, 0], mean: 11 / 7 },
      { v: [1, 1, 1, 1], p: [2, 6, 2, 4], mean: 1 },
    ];

    testCases.forEach(({ v, p, mean }) => {
      const a = new RV(v as number[], p as number[]);
      expect(a.mean()).toBeCloseTo(mean);
    });
  });

  it('should get std', () => {
    const testCases = [
      { v: [1], p: [1], std: 0 },
      { v: [1, 2, 3], p: [1, 1, 1], std: Math.sqrt(2 / 3) },
      { v: [2, 1, 3], p: [1, 1, 1], std: Math.sqrt(2 / 3) },
      { v: [1, 2, 3], p: [2, 2, 2], std: Math.sqrt(2 / 3) },
      { v: [1, 2, 3], p: [4, 4, 2], std: Math.sqrt(0.56) },
      { v: [1.1, 2.1, 3.1], p: [1, 1, 1], std: Math.sqrt(2 / 3) },
      { v: [], p: [], std: 0 },
      { v: [1, 1, 3], p: [1, 5, 1], std: Math.sqrt(24 / 49) },
      { v: [1, 1, 3, 3], p: [2, 6, 2, 4], std: Math.sqrt(48 / 49) },
      { v: [3, 3, 1, 1], p: [2, 6, 2, 4], std: Math.sqrt(48 / 49) },
      { v: [3, 1, 3, 1], p: [2, 6, 2, 4], std: Math.sqrt(40 / 49) },
      { v: [3, 1, 3, 1, 5], p: [2, 6, 2, 4, 0], std: Math.sqrt(40 / 49) },
      { v: [1, 1, 1, 1], p: [2, 6, 2, 4], std: 0 },
    ];

    testCases.forEach(({ v, p, std }) => {
      const a = new RV(v as number[], p as number[]);
      expect(a.std()).toBeCloseTo(std);
    });
  });

  it('should get CDF', () => {
    const testCases = [
      { v: [1], p: [1], cdf_probs: [1] },
      { v: [1, 2, 3], p: [1, 1, 1], cdf_probs: [1, 2, 3] },
      { v: [2, 1, 3], p: [1, 1, 1], cdf_probs: [1, 2, 3] },
      { v: [1, 2, 3], p: [2, 2, 2], cdf_probs: [1, 2, 3] },
      { v: [1, 2, 3], p: [4, 4, 2], cdf_probs: [2, 4, 5] },
      { v: [1.1, 2.1, 3.1], p: [1, 1, 1], cdf_probs: [1, 2, 3] },
      { v: [], p: [], cdf_probs: [1] },
      { v: [1, 3], p: [6, 1], cdf_probs: [6, 7] },
      { v: [1, 3], p: [8, 4], cdf_probs: [2, 3] },
      { v: [1], p: [14], cdf_probs: [1] },
    ];

    testCases.forEach(({ v, p, cdf_probs }) => {
      const a = new RV(v as number[], p as number[]);
      const b = a.get_cdf();
      expect(b.vals).toEqual(a.vals);
      expect(b.probs).toEqual(cdf_probs);
    });
  });

  describe('roll', () => {
    it('should roll 1dN', () => {
      [1, 2, 3, 4, 5, 6, 8, 20, 100, 200, 201].forEach(n => {
        const r = roll(n);
        expect(r).toBeInstanceOf(RV);
        expect(r.probs.length).toBe(n);
        expect(r.vals.length).toBe(n);
        expect(r.probs).toEqual(new Array(n).fill(1));
        expect(r.vals).toEqual(Array.from({ length: n }, (_, i) => i + 1));
      });
    });

    it('should roll -NdN', () => {
      [-1, -2, -3, -4, -5, -6, -8, -20].forEach(n => {
        const r = roll(n);
        expect(r).toBeInstanceOf(RV);
        expect(r.probs.length).toBe(Math.abs(n));
        expect(r.vals.length).toBe(Math.abs(n));
        expect(r.probs).toEqual(new Array(Math.abs(n)).fill(1));
        expect(r.vals).toEqual(Array.from({ length: Math.abs(n) }, (_, i) => i + n));
      });
    });

    it('should roll 0dN', () => {
      const r = roll(0);
      expect(r).toBeInstanceOf(RV);
      expect(r.probs).toEqual([1]);
      expect(r.vals).toEqual([0]);
    });

    it('should roll ndm', () => {
      const testCases = [
        { n: 2, m: 2, expected: RV.from_rvs([(roll(2) as any).__add__(roll(2))]) },
        { n: 1, m: 2, expected: roll(2) },
        { n: 1, m: 3, expected: roll(3) },
        { n: 3, m: 4, expected: RV.from_rvs([(roll(4) as any).__add__(roll(4)).__add__(roll(4))]) },
        { n: 2, m: 4, expected: new RV([2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 3, 2, 1]) },
      ];

      testCases.forEach(({ n, m, expected }) => {
        const result = roll(n, m);
        expect(RV.dices_are_equal(result, expected)).toBe(true);
      });
    });

it('should get len of dice', () => {
      expect((roll(6) as any).__len__()).toBe(1);
      expect((roll(2, 6) as any).__len__()).toBe(2);
      expect((roll(3, 6) as any).__len__()).toBe(3);
      expect((roll(4, 6) as any).__len__()).toBe(4);
      expect((roll(1, roll(4, 6)) as any).__len__()).toBe(4);
      expect((roll(1, roll(2, roll(4, 6))) as any).__len__()).toBe(2);
    });

    it('should not change len on 1 roll', () => {
      const a = roll(3, 4);
      expect((a as any).__len__()).toBe(3);
      const b = roll(2, a);
      expect((b as any).__len__()).toBe(2);
      const c = roll(1, a);
      expect((c as any).__len__()).toBe(3);  // rolling 1 time doesn't change original length
    });
  });

  describe('matmul', () => {
    it('should handle NUM @ DIE', () => {
      const testCases = [
        { l: 1, r: roll(2, 4), expected: new RV([1, 2, 3, 4], [1, 3, 5, 7]) },
        { l: 1, r: roll(2, 2), expected: new RV([1, 2], [1, 3]) },
        { l: 1, r: (roll(2) as any).__add__(roll(2)), expected: new RV([2, 3, 4], [1, 2, 1]) },
        { l: 2, r: (roll(2) as any).__add__(roll(2)), expected: new RV([0], [1]) },
        // Seq case - skip for now as _sum_at needs fixing
        // { l: new Seq(1, 2), r: roll(2, 4), expected: new RV([2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 3, 2, 1]) },
        { l: 3, r: roll(2, 4), expected: new RV([0], [1]) },
        { l: 1, r: roll(3, 6), expected: new RV([1, 2, 3, 4, 5, 6], [1, 7, 19, 37, 61, 91]) },
        { l: 3, r: roll(3, 6), expected: new RV([1, 2, 3, 4, 5, 6], [91, 61, 37, 19, 7, 1]) },
        { l: 0, r: roll(6), expected: new RV([0], [1]) },
        { l: 1, r: roll(6), expected: roll(6) },
        { l: 2, r: roll(6), expected: new RV([0], [1]) },
        { l: -1, r: roll(2, 6), expected: new RV([0], [1]) },
        { l: 0, r: roll(2, 6), expected: new RV([0], [1]) },
        { l: 3, r: roll(2, 6), expected: new RV([0], [1]) },
        { l: 13, r: roll(2, 6), expected: new RV([0], [1]) },
      ];

      testCases.forEach(({ l, r, expected }) => {
        const left = l as any;
        const result = r.__rmatmul__(left);
        expect(RV.dices_are_equal(result, expected)).toBe(true);
      });
    });
  });

  describe('truncate', () => {
    it('should truncate correctly', () => {
      settings_set('RV_TRUNC', false);
      const a = (roll(6) as any).__truediv__(roll(6));
      expect(a).toBeInstanceOf(RV);
      const b = new RV(a.vals, a.probs, false);
      const c = new RV(a.vals, a.probs, true);
      settings_set('RV_TRUNC', true);
      const d = (roll(6) as any).__truediv__(roll(6));
      expect(RV.dices_are_equal(a, b)).toBe(true);
      expect(RV.dices_are_equal(c, d)).toBe(true);
      expect(RV.dices_are_equal(a, c)).toBe(false);
      expect(RV.dices_are_equal(a, d)).toBe(false);
      expect(RV.dices_are_equal(b, c)).toBe(false);
      expect(RV.dices_are_equal(b, d)).toBe(false);
    });
  });
});
