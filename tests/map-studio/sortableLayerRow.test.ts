import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  droppableOptions: null as any,
  draggableOptions: null as any,
  handleDragStart: vi.fn(),
}));

vi.mock('@vue-dnd-kit/core', async () => {
  const { computed, ref } = await import('vue');
  return {
    useDroppable: (options: any) => {
      mocks.droppableOptions = options;
      return {
        elementRef: ref(null),
        isOvered: computed(() => false),
      };
    },
    useDraggable: (options: any) => {
      mocks.draggableOptions = options;
      return {
        elementRef: ref(null),
        isDragging: computed(() => false),
        handleDragStart: mocks.handleDragStart,
      };
    },
  };
});

import SortableLayerRow from '@/map-studio/components/SortableLayerRow.vue';
import {
  createDungeonLayer,
  createFolderLayer,
} from '@/map-studio/domain/document/factories';

function storeWith(
  layerId: string | undefined,
  point: { x: number; y: number } | null,
) {
  return {
    draggingElements: {
      value: new Map(layerId ? [['drag', { data: { layerId } }]] : []),
    },
    pointerPosition: { current: { value: point } },
  };
}

function rect(top: number, height: number): DOMRect {
  return {
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 100,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('SortableLayerRow', () => {
  beforeEach(() => {
    mocks.droppableOptions = null;
    mocks.draggableOptions = null;
    mocks.handleDragStart.mockReset();
  });

  it('emits before and after drops', async () => {
    const wrapper = mount(SortableLayerRow, {
      props: { layer: createDungeonLayer({ id: 'target' }) },
      slots: { default: '<span class="name">Target</span>' },
      attachTo: document.body,
    });
    wrapper.element.getBoundingClientRect = () => rect(10, 40);

    mocks.droppableOptions.events.onDrop(storeWith('dragged', { x: 0, y: 12 }));
    expect(wrapper.emitted('drop')?.[0]?.[0]).toEqual({
      layerId: 'dragged',
      targetId: 'target',
      placement: 'before',
    });

    mocks.droppableOptions.events.onDrop(storeWith('dragged', { x: 0, y: 45 }));
    expect(wrapper.emitted('drop')?.[1]?.[0]).toMatchObject({
      placement: 'after',
    });
    wrapper.unmount();
  });

  it('drops into the middle of a folder', async () => {
    const wrapper = mount(SortableLayerRow, {
      props: { layer: createFolderLayer({ id: 'folder' }) },
      slots: { default: '<span>Folder</span>' },
      attachTo: document.body,
    });
    wrapper.element.getBoundingClientRect = () => rect(0, 40);
    mocks.droppableOptions.events.onDrop(storeWith('dragged', { x: 0, y: 20 }));
    expect(wrapper.emitted('drop')?.[0]?.[0]).toMatchObject({
      targetId: 'folder',
      placement: 'inside',
    });
    wrapper.unmount();
  });

  it('ignores self, missing and pointer-less drops', async () => {
    const wrapper = mount(SortableLayerRow, {
      props: { layer: createDungeonLayer({ id: 'same' }) },
      slots: { default: '<span>Same</span>' },
      attachTo: document.body,
    });
    wrapper.element.getBoundingClientRect = () => rect(0, 40);
    mocks.droppableOptions.events.onDrop(storeWith('same', { x: 0, y: 5 }));
    mocks.droppableOptions.events.onDrop(storeWith(undefined, { x: 0, y: 5 }));
    mocks.droppableOptions.events.onDrop(storeWith('other', null));
    expect(wrapper.emitted('drop')).toBeUndefined();
    wrapper.unmount();
  });

  it('tracks hover placement classes', async () => {
    const wrapper = mount(SortableLayerRow, {
      props: { layer: createFolderLayer({ id: 'folder' }) },
      slots: { default: '<span>Folder</span>' },
      attachTo: document.body,
    });
    wrapper.element.getBoundingClientRect = () => rect(0, 40);
    mocks.droppableOptions.events.onHover(storeWith('dragged', { x: 0, y: 5 }));
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('sortable-layer-row--before');
    mocks.droppableOptions.events.onHover(
      storeWith('dragged', { x: 0, y: 20 }),
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('sortable-layer-row--inside');
    mocks.droppableOptions.events.onLeave();
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('sortable-layer-row--before');
    wrapper.unmount();
  });

  it('drags from the row but not from buttons or when disabled', async () => {
    const wrapper = mount(SortableLayerRow, {
      props: { layer: createDungeonLayer({ id: 'a' }) },
      slots: { default: '<button class="action">Act</button>' },
      attachTo: document.body,
    });
    await wrapper.trigger('pointerdown');
    expect(mocks.handleDragStart).toHaveBeenCalledTimes(1);
    await wrapper.find('.action').trigger('pointerdown');
    expect(mocks.handleDragStart).toHaveBeenCalledTimes(1);

    mocks.draggableOptions.events.onStart();
    mocks.draggableOptions.events.onMove();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    wrapper.element.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    mocks.draggableOptions.events.onEnd();
    wrapper.unmount();

    const disabled = mount(SortableLayerRow, {
      props: { layer: createDungeonLayer({ id: 'b' }), disabled: true },
      slots: { default: '<span>B</span>' },
      attachTo: document.body,
    });
    await disabled.trigger('pointerdown');
    expect(mocks.handleDragStart).toHaveBeenCalledTimes(1);
    disabled.unmount();
  });
});
