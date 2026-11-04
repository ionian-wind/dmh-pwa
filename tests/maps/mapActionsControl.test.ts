import { describe, expect, it, vi } from 'vitest';
import { MapActionsControl } from '@/maps/plugins/MapActionsControl';
import { MAP_ACTION_EVENT } from '@/maps/plugins/mapActionEvents';

const labels = {
  title: 'Actions',
  addMarker: 'Add marker',
  drawArea: 'Draw area',
  shapes: {
    polygon: 'Polygon',
    circle: 'Circle',
    square: 'Square',
    freehand: 'Freehand',
  },
  cancelDrawing: 'Cancel drawing',
};

function createControl() {
  const control = new MapActionsControl(labels);
  const map = {
    dispatchEvent: vi.fn(),
    addControl: vi.fn(),
    removeControl: vi.fn(),
    getOverlayContainerStopEvent: () => document.body,
    render: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  control.setMap(map as any);
  return { control, map };
}

describe('MapActionsControl', () => {
  it('toggles the menu and dispatches actions', () => {
    const { control, map } = createControl();
    const element = control.getElement();
    const trigger = element.querySelector(
      '.ol-map-actions-trigger',
    ) as HTMLButtonElement;
    const menu = element.querySelector(
      '.ol-map-actions-menu',
    ) as HTMLDivElement;

    trigger.click();
    expect(menu.hidden).toBe(false);
    trigger.click();
    expect(menu.hidden).toBe(true);

    trigger.click();
    const add = menu.querySelector(
      '[data-action="add-marker"]',
    ) as HTMLButtonElement;
    add.click();
    expect(map.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'add-marker' }),
    );
    expect(menu.hidden).toBe(true);

    trigger.click();
    const circle = menu.querySelector(
      '[data-action="draw-area"][data-shape="circle"]',
    ) as HTMLButtonElement;
    circle.click();
    expect(map.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'draw-area', shape: 'circle' }),
    );

    trigger.click();
    menu.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    trigger.click();
    element.remove();
  });

  it('closes on outside pointer events and visibility changes', () => {
    const { control } = createControl();
    const element = control.getElement();
    const trigger = element.querySelector(
      '.ol-map-actions-trigger',
    ) as HTMLButtonElement;
    const menu = element.querySelector(
      '.ol-map-actions-menu',
    ) as HTMLDivElement;

    trigger.click();
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(menu.hidden).toBe(true);

    trigger.click();
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(menu.hidden).toBe(false);

    control.setVisible(false);
    expect(element.style.display).toBe('none');
    expect(menu.hidden).toBe(true);
    control.setVisible(true);
    expect(element.style.display).toBe('');
  });

  it('updates labels and drawing state', () => {
    const { control } = createControl();
    control.setLabels({ ...labels, addMarker: 'New marker' });
    const element = control.getElement();
    expect(element.textContent).toContain('New marker');
    control.setDrawingActive(true);
    const cancel = element.querySelector(
      '[data-action="cancel-drawing"]',
    ) as HTMLButtonElement;
    expect(cancel.hidden).toBe(false);
    control.setDrawingActive(false);
    expect(cancel.hidden).toBe(true);

    const map = control.getMap();
    control.setMap(null);
    expect(control.getMap()).toBeNull();
    expect(map).toBeTruthy();
    element.remove();
  });
});
