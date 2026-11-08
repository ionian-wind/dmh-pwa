import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  droppableOptions: null as any,
  draggable: [] as Array<{ options: any; handleDragStart: any }>,
  applyTransfer: vi.fn(),
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
      const handleDragStart = vi.fn();
      mocks.draggable.push({ options, handleDragStart });
      return {
        elementRef: ref(null),
        isDragging: computed(() => false),
        handleDragStart,
      };
    },
    DnDOperations: { applyTransfer: mocks.applyTransfer },
  };
});

import SortableList from '@/components/common/SortableList.vue';
import SortableItem from '@/components/common/SortableItem.vue';

const Item = defineComponent({
  props: { label: String },
  setup(props) {
    return () => h('div', { class: 'item' }, props.label);
  },
});

describe('SortableList', () => {
  beforeEach(() => {
    mocks.droppableOptions = null;
    mocks.draggable = [];
    mocks.applyTransfer.mockReset();
  });

  it('renders items and emits the reordered list on drop', async () => {
    const items = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const wrapper = mount(SortableList, {
      props: { modelValue: items, itemKey: 'id' },
      slots: {
        item: ({ element }: any) => h(Item, { label: element.label }),
      },
    });

    expect(wrapper.findAll('.item')).toHaveLength(2);
    expect(wrapper.findAll('.sortable-item')).toHaveLength(2);
    expect(mocks.draggable).toHaveLength(2);
    expect(mocks.draggable[0].options.data.value).toMatchObject({
      source: items,
      index: 0,
      item: items[0],
    });

    mocks.applyTransfer.mockImplementation((store: any) => {
      const source = store.draggingElements.value.values().next().value
        .data.source;
      const [moved] = source.splice(0, 1);
      source.splice(1, 0, moved);
    });

    mocks.droppableOptions.events.onDrop({
      draggingElements: {
        value: new Map([
          ['drag', { data: { source: items, index: 0, item: items[0] } }],
        ]),
      },
    });
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      { id: 'b', label: 'B' },
      { id: 'a', label: 'A' },
    ]);
    expect(wrapper.emitted('end')?.[0]?.[0]).toEqual({
      oldIndex: 0,
      newIndex: 1,
    });
    wrapper.unmount();
  });

  it('ignores drops without a resolvable or changed position', async () => {
    const missingKeyItems = [{ label: 'A' }];
    const missingKey = mount(SortableList, {
      props: { modelValue: missingKeyItems, itemKey: 'id' },
      slots: {
        item: ({ element }: any) => h(Item, { label: element.label }),
      },
    });
    mocks.applyTransfer.mockImplementation(() => undefined);
    mocks.droppableOptions.events.onDrop({
      draggingElements: {
        value: new Map([
          [
            'drag',
            {
              data: {
                source: missingKeyItems,
                index: 0,
                item: missingKeyItems[0],
              },
            },
          ],
        ]),
      },
    });
    expect(missingKey.emitted('end')).toBeUndefined();
    expect(missingKey.emitted('update:modelValue')).toBeUndefined();
    missingKey.unmount();

    const items = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const wrapper = mount(SortableList, {
      props: { modelValue: items, itemKey: 'id' },
      slots: {
        item: ({ element }: any) => h(Item, { label: element.label }),
      },
    });
    mocks.droppableOptions.events.onDrop({
      draggingElements: {
        value: new Map([
          ['drag', { data: { source: items, index: 0, item: items[0] } }],
        ]),
      },
    });
    expect(wrapper.emitted('end')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });
});

describe('SortableItem', () => {
  beforeEach(() => {
    mocks.draggable = [];
  });

  function mountItem(props: Record<string, any> = {}) {
    return mount(SortableItem, {
      props: {
        item: { id: 'a' },
        index: 0,
        source: [{ id: 'a' }],
        itemKey: 'id',
        groups: ['sortable-list'],
        ...props,
      },
      slots: { default: '<button class="inside">Inside</button>' },
    });
  }

  it('starts dragging from the item but not from buttons', async () => {
    const wrapper = mountItem();
    const handle = mocks.draggable[0].handleDragStart;
    await wrapper.trigger('pointerdown');
    expect(handle).toHaveBeenCalledTimes(1);
    mocks.draggable[0].options.events.onStart();
    mocks.draggable[0].options.events.onMove();
    await wrapper.trigger('click');
    mocks.draggable[0].options.events.onEnd();
    await wrapper.find('.inside').trigger('pointerdown');
    expect(handle).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new PointerEvent('pointerup'));
    vi.useFakeTimers();
    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    wrapper.unmount();
  });

  it('respects handle, disabled and lifecycle state', async () => {
    const wrapper = mountItem({ handle: '.drag-handle' });
    const entry = mocks.draggable[0];
    await wrapper.find('.inside').trigger('pointerdown');
    expect(entry.handleDragStart).not.toHaveBeenCalled();
    wrapper.unmount();

    const handleWrapper = mount(SortableItem, {
      props: {
        item: { id: 'a' },
        index: 0,
        source: [{ id: 'a' }],
        itemKey: 'id',
        groups: ['sortable-list'],
        handle: '.drag-handle',
      },
      slots: {
        default: '<span class="drag-handle">Handle</span>',
      },
    });
    await handleWrapper.find('.drag-handle').trigger('pointerdown');
    expect(mocks.draggable[1].handleDragStart).toHaveBeenCalled();
    handleWrapper.unmount();

    const disabled = mountItem({ disabled: true });
    await disabled.trigger('pointerdown');
    expect(mocks.draggable[2].handleDragStart).not.toHaveBeenCalled();
    disabled.unmount();
  });
});
