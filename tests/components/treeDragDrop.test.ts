import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';

const dnd = vi.hoisted(() => ({
  handleDragStart: vi.fn(),
  applyTransfer: vi.fn(),
  draggableOptionsList: [] as any[],
  droppableOptionsList: [] as any[],
  isOveredRefList: [] as any[],
}));

vi.mock('@vue-dnd-kit/core', async () => {
  const { ref } = await import('vue');
  return {
    DnDOperations: { applyTransfer: dnd.applyTransfer },
    useDraggable: (options: any) => {
      dnd.draggableOptionsList.push(options);
      return { handleDragStart: dnd.handleDragStart, elementRef: ref(null) };
    },
    useDroppable: (options: any) => {
      dnd.droppableOptionsList.push(options);
      const isOvered = ref(false);
      dnd.isOveredRefList.push(isOvered);
      return { elementRef: ref(null), isOvered };
    },
  };
});

import Tree from '@/components/Tree/Tree.vue';
import TreeControls from '@/components/Tree/TreeControls.vue';
import ModuleDocumentTree from '@/modules/ModuleDocumentTree.vue';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));

const data = [
  {
    id: 'a',
    title: 'Alpha',
    children: [{ id: 'b', title: 'Beta', children: [] }],
  },
];

function mountTree() {
  return mount(Tree as any, {
    props: { data, itemKey: 'id', nestingKey: 'children' },
    slots: {
      default: ({ item }: any) =>
        h('span', { class: 'tree-label' }, item.title),
    },
  });
}

describe('Tree drag-and-drop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dnd.draggableOptionsList = [];
    dnd.droppableOptionsList = [];
    dnd.isOveredRefList = [];
  });

  it('renders nested items and wires draggable handles', async () => {
    const wrapper = mountTree();
    await nextTick();

    expect(wrapper.findAll('.tree-item')).toHaveLength(2);
    expect(wrapper.text()).toContain('Alpha');
    expect(wrapper.text()).toContain('Beta');

    const handles = wrapper.findAll('.tree-drag-handle');
    expect(handles).toHaveLength(2);
    await handles[0].trigger('pointerdown');
    expect(dnd.handleDragStart).toHaveBeenCalledTimes(1);

    expect(dnd.draggableOptionsList[0].data.value).toEqual({
      source: data,
      index: 0,
    });
    wrapper.unmount();
  });

  it('collapses and expands child nodes', async () => {
    const wrapper = mountTree();
    await nextTick();
    expect(wrapper.text()).toContain('Beta');

    await wrapper.findAll('.tree-arrow')[0].trigger('click');
    await nextTick();
    expect(wrapper.text()).not.toContain('Beta');

    await wrapper.findAll('.tree-arrow')[0].trigger('click');
    await nextTick();
    expect(wrapper.text()).toContain('Beta');
    wrapper.unmount();
  });

  it('wires the droppable container and applies transfers', async () => {
    const wrapper = mountTree();
    await nextTick();

    const droppable = dnd.droppableOptionsList[0];
    expect(droppable.groups).toEqual(['tree']);
    expect(droppable.data.value).toEqual({ source: data });
    droppable.events.onDrop();
    expect(dnd.applyTransfer).toHaveBeenCalled();

    dnd.isOveredRefList[0].value = true;
    await nextTick();
    expect(wrapper.find('.tree-container').classes()).toContain(
      'tree-container-overed',
    );
    wrapper.unmount();
  });
});

describe('TreeControls drag handle', () => {
  it('emits expand and drag callbacks', async () => {
    const onArrowClick = vi.fn();
    const onDragStart = vi.fn();
    const wrapper = mount(TreeControls, {
      props: {
        expanded: true,
        hasChildren: true,
        onArrowClick,
        onDragStart,
      },
    });

    expect(wrapper.find('svg.expanded').exists()).toBe(true);
    await wrapper.find('.tree-arrow').trigger('click');
    expect(onArrowClick).toHaveBeenCalledTimes(1);

    await wrapper.find('.tree-drag-handle').trigger('pointerdown');
    expect(onDragStart).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('renders a dot for leaf nodes and no expanded marker', () => {
    const wrapper = mount(TreeControls, { props: { hasChildren: false } });
    expect(wrapper.find('.tree-item-dot').exists()).toBe(true);
    expect(wrapper.find('.tree-arrow svg').exists()).toBe(false);
    wrapper.unmount();
  });
});

const TreeStub = defineComponent({
  name: 'Tree',
  props: { data: Array, itemKey: String, nestingKey: String },
  setup(props, { slots }) {
    return () => {
      const items = (props.data ?? []) as any[];
      return h('div', { class: 'tree-stub' }, [
        h(
          'button',
          {
            class: 'reverse-tree',
            onClick: () => items.reverse(),
          },
          'reverse',
        ),
        ...items.map((item) => slots.default?.({ item })),
      ]);
    };
  },
});

describe('ModuleDocumentTree drag result propagation', () => {
  it('emits an updated note tree after a drag-style reorder', async () => {
    const NoteEditorStub = defineComponent({
      name: 'NoteEditor',
      setup: () => () => h('div', { class: 'note-editor-stub' }),
    });
    const wrapper = mount(ModuleDocumentTree, {
      props: {
        moduleId: 'm1',
        noteTree: [{ noteId: 'n1' }, { noteId: 'n2' }],
      },
      global: {
        stubs: { Tree: TreeStub, NoteEditor: NoteEditorStub },
      },
    });
    await nextTick();

    await wrapper.find('.reverse-tree').trigger('click');
    await nextTick();

    const emitted = wrapper.emitted('update:noteTree')?.[0]?.[0] as any[];
    expect(emitted.map((node) => node.noteId)).toEqual(['n2', 'n1']);
    wrapper.unmount();
  });
});
