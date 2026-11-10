import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  listOptions: null as any,
  itemOptions: [] as any[],
}));

vi.mock('@vue-dnd-kit/core', async () => {
  const { computed } = await import('vue');
  return {
    makeSortableList: (_target: any, options: any) => {
      mocks.listOptions = options;
      return {
        items: options.items,
        isOver: computed(() => false),
        isAccepting: computed(() => false),
      };
    },
    makeSortableItem: (_target: any, options: any) => {
      mocks.itemOptions.push(options);
      return {
        isDragging: computed(() => false),
        isPlaceholder: computed(() => false),
        selected: computed({
          get: () => false,
          set: () => undefined,
        }),
        indicator: computed(() => null),
        index: computed(() => 0),
      };
    },
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
    mocks.listOptions = null;
    mocks.itemOptions = [];
  });

  function mountList(overrides: Record<string, any> = {}) {
    const items = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    return mount(SortableList, {
      props: { modelValue: items, itemKey: 'id', ...overrides },
      slots: {
        item: ({ element }: any) => h(Item, { label: element.label }),
      },
    });
  }

  it('renders the draft and emits the reordered list', async () => {
    const wrapper = mountList();
    expect(wrapper.findAll('.item')).toHaveLength(2);
    expect(wrapper.findAll('.sortable-item')).toHaveLength(2);
    expect(mocks.itemOptions).toHaveLength(2);
    expect(mocks.itemOptions[0].item()).toMatchObject({ id: 'a' });

    mocks.listOptions.onDrop({
      from: { index: 0 },
      to: { index: 1 },
      sameList: true,
    });
    expect(wrapper.emitted('end')?.[0]?.[0]).toEqual({
      oldIndex: 0,
      newIndex: 1,
    });

    mocks.listOptions.items.value = [
      { id: 'b', label: 'B' },
      { id: 'a', label: 'A' },
    ];
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      { id: 'b', label: 'B' },
      { id: 'a', label: 'A' },
    ]);
    wrapper.unmount();
  });

  it('ignores a drop that does not move the item', () => {
    const wrapper = mountList();
    mocks.listOptions.onDrop({
      from: { index: 1 },
      to: { index: 1 },
      sameList: true,
    });
    expect(wrapper.emitted('end')).toBeUndefined();
    wrapper.unmount();
  });

  it('passes group, handle and disabled options through', () => {
    const wrapper = mountList({
      groups: ['playlists'],
      handle: '.drag-handle',
      disabled: true,
    });
    expect(mocks.listOptions.group).toBe('playlists');
    expect(mocks.listOptions.disabled()).toBe(true);
    expect(mocks.itemOptions[0].handle()).toBe('.drag-handle');
    expect(mocks.itemOptions[0].disabled()).toBe(true);
    wrapper.unmount();
  });
});

describe('SortableItem', () => {
  beforeEach(() => {
    mocks.itemOptions = [];
  });

  it('renders its slot and exposes the item key', () => {
    const wrapper = mount(SortableItem, {
      props: {
        item: { id: 'a' },
        itemKey: 'id',
        index: 0,
        handle: '.handle',
      },
      slots: { default: '<span class="content">Content</span>' },
    });
    expect(wrapper.find('.content').exists()).toBe(true);
    expect(mocks.itemOptions[0].id()).toBe('a');
    expect(mocks.itemOptions[0].handle()).toBe('.handle');
    expect(wrapper.classes()).not.toContain('sortable-item--dragging');
    expect(wrapper.classes()).not.toContain('sortable-item--placeholder');
    wrapper.unmount();
  });
});
