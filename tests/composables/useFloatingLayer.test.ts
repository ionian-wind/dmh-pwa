import { describe, expect, it } from 'vitest';
import { useFloatingLayer } from '@/composables/useFloatingLayer';

describe('useFloatingLayer', () => {
  it('keeps dialogs above panels even after a panel is focused', () => {
    const panel = useFloatingLayer(5000);
    const dialog = useFloatingLayer(6000);
    panel.bringToFront();
    expect(panel.zIndex.value).toBeLessThan(dialog.zIndex.value);
  });

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
