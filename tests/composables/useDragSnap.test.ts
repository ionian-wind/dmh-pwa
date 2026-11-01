import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

import { useDragSnap } from '@/composables/useDragSnap';

function mountComposable() {
  let api: ReturnType<typeof useDragSnap> | null = null;
  const TestComponent = defineComponent({
    setup() {
      api = useDragSnap();
      return () => h('div');
    },
  });
  mount(TestComponent);
  return api as unknown as ReturnType<typeof useDragSnap>;
}

describe('useDragSnap', () => {
  it('tracks pointer movement and snaps back below the threshold', () => {
    const drag = mountComposable();
    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();

    drag.onPointerDown({
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      target,
    } as any);
    expect(drag.isDragging.value).toBe(true);
    expect(drag.cardStyle.value.cursor).toBe('grabbing');
    expect(target.setPointerCapture).toHaveBeenCalledWith(1);

    drag.onPointerMove({ clientX: 140, clientY: 50 } as PointerEvent);
    expect(drag.cardStyle.value.transform).toBe('translate(40px, -50px)');
    expect(drag.transitionHide.value).toBe('fade');

    drag.onPointerUp();
    expect(drag.isDragging.value).toBe(false);
    expect(drag.cardStyle.value.transform).toBe('translate(0px, 0px)');
    expect(drag.cardStyle.value.transition).toBe('transform 0.3s ease');
    expect(drag.transitionHide.value).toBeUndefined();
  });

  it('keeps the card offset when released above the snap threshold', () => {
    const drag = mountComposable();
    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();

    drag.onPointerDown({
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      target,
    } as any);
    drag.onPointerMove({ clientX: 0, clientY: -250 } as PointerEvent);
    drag.onPointerUp();

    expect(drag.isDragging.value).toBe(false);
    expect(drag.cardStyle.value.transform).toBe('translate(0px, -250px)');
    expect(drag.cardStyle.value.transition).toBe('none');
    expect(drag.transitionHide.value).toBe('fade');
  });

  it('ignores moves before dragging starts and resets on hide', () => {
    const drag = mountComposable();

    drag.onPointerMove({ clientX: 20, clientY: 20 } as PointerEvent);
    expect(drag.cardStyle.value.transform).toBe('translate(0px, 0px)');

    drag.onPointerUp();
    expect(drag.isDragging.value).toBe(false);

    const target = document.createElement('div');
    target.setPointerCapture = vi.fn();
    drag.onPointerDown({
      clientX: 0,
      clientY: 0,
      pointerId: 1,
      target,
    } as any);
    drag.onPointerMove({ clientX: 10, clientY: -300 } as PointerEvent);
    drag.onHide();

    expect(drag.cardStyle.value.transform).toBe('translate(0px, 0px)');
    expect(drag.transitionHide.value).toBeUndefined();
  });
});
