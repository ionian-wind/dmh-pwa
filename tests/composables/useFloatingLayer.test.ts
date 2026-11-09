import { describe, expect, it } from 'vitest';
import { useFloatingLayer } from '@/composables/useFloatingLayer';

describe('useFloatingLayer', () => {
  it('raises the focused layer above the others', () => {
    const first = useFloatingLayer();
    const second = useFloatingLayer();
    expect(second.zIndex.value).toBeGreaterThan(first.zIndex.value);

    first.bringToFront();
    expect(first.zIndex.value).toBeGreaterThan(second.zIndex.value);

    second.bringToFront();
    expect(second.zIndex.value).toBeGreaterThan(first.zIndex.value);
  });
});
