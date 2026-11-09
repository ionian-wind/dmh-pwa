import { describe, expect, it } from 'vitest';
import quasarTablerIconSet, {
  tablerIconMapFn,
} from '@/plugins/quasar-tabler-icon-set';

describe('quasar tabler icon set', () => {
  it('maps Quasar icon slots to Tabler SVG paths', () => {
    expect(quasarTablerIconSet.name).toBe('tabler');
    expect(quasarTablerIconSet.type.positive).toContain('|0 0 24 24');
    expect(quasarTablerIconSet.type.positive).toContain('stroke:currentColor');
    expect(quasarTablerIconSet.expansionItem.icon).toContain('|0 0 24 24');
  });

  it('resolves tabler-prefixed icon names through the icon map', () => {
    expect(tablerIconMapFn('tabler-plus')).toEqual({
      icon: expect.stringContaining('|0 0 24 24'),
    });
    expect(tablerIconMapFn('tabler-pencil')).toBeTruthy();
    expect(tablerIconMapFn('material-icons')).toBeUndefined();
    expect(tablerIconMapFn('tabler-missing')).toBeUndefined();
  });
});
