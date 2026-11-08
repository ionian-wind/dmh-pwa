import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { createLayoutStore, unwrapProps } from '@/composables/useLayout';

describe('layout store', () => {
  it('stores header and footer content', () => {
    const layout = createLayoutStore();
    const header = { component: { name: 'Header' } };
    const footer = { component: { name: 'Footer' } };

    layout.setTopMenuContent(header);
    layout.setBottomDrawerContent(footer);

    expect(layout.topMenuContent.value).toEqual(header);
    expect(layout.bottomDrawerContent.value).toEqual(footer);
    layout.setTopMenuContent(null);
    layout.setBottomDrawerContent(null);
    expect(layout.topMenuContent.value).toBeNull();
  });

  it('only clears the right drawer for its owner', () => {
    const layout = createLayoutStore();
    const ownerA = Symbol('drawer-a');
    const ownerB = Symbol('drawer-b');
    const content = { component: { name: 'Sidebar' } };

    layout.setRightDrawerContent(content, ownerA);
    expect(layout.rightDrawerContent.value).toEqual(content);

    layout.clearRightDrawer(ownerB);
    expect(layout.rightDrawerContent.value).toEqual(content);

    layout.clearRightDrawer(ownerA);
    expect(layout.rightDrawerContent.value).toBeNull();
  });

  it('allows a new owner to take over the right drawer', () => {
    const layout = createLayoutStore();
    const ownerA = Symbol('drawer-a');
    const ownerB = Symbol('drawer-b');
    const first = { component: { name: 'First' } };
    const second = { component: { name: 'Second' } };

    layout.setRightDrawerContent(first, ownerA);
    layout.setRightDrawerContent(second, ownerB);
    expect(layout.rightDrawerContent.value).toEqual(second);

    layout.clearRightDrawer(ownerA);
    expect(layout.rightDrawerContent.value).toEqual(second);

    layout.clearRightDrawer(ownerB);
    expect(layout.rightDrawerContent.value).toBeNull();
  });

  it('unwraps refs passed to injected components', () => {
    const pawn = ref({ id: 'pawn-1' });
    const props = unwrapProps({ pawn, count: 2, label: 'Pawn' });

    expect(props).toEqual({
      pawn: { id: 'pawn-1' },
      count: 2,
      label: 'Pawn',
    });
    expect(unwrapProps()).toBeUndefined();
  });

  it('toggles the right drawer', () => {
    const layout = createLayoutStore();
    expect(layout.rightDrawerOpen.value).toBe(true);
    layout.toggleRightDrawer();
    expect(layout.rightDrawerOpen.value).toBe(false);
    layout.toggleRightDrawer();
    expect(layout.rightDrawerOpen.value).toBe(true);
  });
});
