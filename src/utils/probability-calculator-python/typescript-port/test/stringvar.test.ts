import { describe, it, expect, beforeEach } from 'vitest';
import { StringVal, get_seq, settings_reset } from '../src/index';
import { RV, roll } from '../src/index';

describe('StringVal', () => {
  beforeEach(() => {
    settings_reset();
  });

  it('should init correctly', () => {
    const a = new StringVal(['a', 'b'], { a: 1, b: 2 });
    const b = new StringVal(['a', 'b'], { a: 1, b: 2 });
    const c = new StringVal(['b', 'a'], { b: 2, a: 1 });
    const d = new StringVal(['a', 'b', 'c'], { a: 1, b: 2, c: 3 });

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(true);
    expect(b.equals(c)).toBe(true);
    expect(a.equals(d)).toBe(false);
    expect(b.equals(d)).toBe(false);
    expect(c.equals(d)).toBe(false);
  });

  it('should format correctly', () => {
    const a = new StringVal(['a', 'b'], { a: 1, b: 2 });
    expect(a.toString()).toBe('a + 2*b');
  });

  it('should compare correctly', () => {
    const a = new StringVal(['a', 'b'], { a: 1, b: 2 });
    const b = new StringVal(['b', 'a'], { b: 2, a: 1 });
    const c = new StringVal(['b', 'a'], { b: 1, a: 1 });

    expect(a.equals(b)).toBe(true);
    expect(a.__le__(b)).toBe(1);
    expect(a.__ge__(b)).toBe(1);
    expect(a.__lt__(b)).toBe(0);
    expect(a.__gt__(b)).toBe(0);
    expect(a.equals(c)).toBe(false);
    expect(a.__gt__(c)).toBe(1);
    expect(a.__ge__(c)).toBe(1);
    expect(a.__lt__(c)).toBe(0);
    expect(a.__le__(c)).toBe(0);
  });

  it('should handle hash', () => {
    const a = new StringVal(['a', 'b'], { a: 1, b: 2 });
    const c = new StringVal(['b', 'a'], { b: 1, a: 1 });
    const d = new StringVal(['a', 'b', 'c'], { a: 1, b: 2, c: 3 });

    expect(a.hash()).not.toBe(c.hash());
    expect(a.hash()).not.toBe(d.hash());
    expect(c.hash()).not.toBe(d.hash());
    expect(a.hash()).toBe(a.hash());
    expect(c.hash()).toBe(c.hash());
    expect(d.hash()).toBe(d.hash());
  });

  it('should get seq', () => {
    const a = get_seq('a', 'b');
    const b = get_seq('a', 'b');
    const c = get_seq(1, 2);
    const d = get_seq(1, 2);
    const e = get_seq(1, 2, 'a', 'b');

    expect(a.equals(b)).toBe(true);
    expect(c.equals(d)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.equals(e)).toBe(false);
    expect(c.equals(e)).toBe(false);
  });

  it('should handle roll', () => {
    const a = get_seq(roll(1, 2), 'fire', 'water');
    const b = roll(2, a);

    const vp = b.get_vals_probs();
    expect(vp.length).toBeGreaterThan(0);
  });
});
