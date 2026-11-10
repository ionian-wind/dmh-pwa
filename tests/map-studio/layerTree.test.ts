import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  treeOptions: null as any,
}));

vi.mock('@vue-dnd-kit/core', async () => {
  const { computed } = await import('vue');
  return {
    makeSortableTree: (_target: any, options: any) => {
      mocks.treeOptions = options;
      const items = computed(() => {
        const collapsed = options.collapsed?.value as
          ReadonlySet<string> | undefined;
        const flat: any[] = [];
        const visit = (
          nodes: any[],
          depth: number,
          parentKey: string | null,
        ) => {
          nodes.forEach((node, index) => {
            flat.push({
              key: node.id,
              item: node,
              depth,
              parentKey,
              index,
              hasChildren: !!node.children?.length,
              collapsed: collapsed?.has(node.id) ?? false,
            });
            if (node.children?.length && !collapsed?.has(node.id)) {
              visit(node.children, depth + 1, node.id);
            }
          });
        };
        visit(options.items() as any[], 0, null);
        return flat;
      });
      return {
        items,
        isOver: computed(() => false),
        isAccepting: computed(() => false),
        indicator: computed(() => null),
        projected: computed(() => null),
      };
    },
    makeSortableItem: () => ({
      isDragging: computed(() => false),
      isPlaceholder: computed(() => false),
      selected: computed({ get: () => false, set: () => undefined }),
      indicator: computed(() => null),
      index: computed(() => 0),
    }),
  };
});

import LayerTree from '@/map-studio/components/LayerTree.vue';
import {
  createDungeonLayer,
  createFolderLayer,
} from '@/map-studio/domain/document/factories';

function mountTree(
  layers: ReturnType<typeof createDungeonLayer>[],
  options: Record<string, any> = {},
) {
  return mount(LayerTree, {
    props: { layers, ...options },
    slots: {
      row: ({ layer }: any) => h('span', { class: 'layer-name' }, layer.name),
    },
  });
}

describe('LayerTree', () => {
  beforeEach(() => {
    mocks.treeOptions = null;
  });

  it('renders nested rows with indentation', () => {
    const wrapper = mountTree([
      createDungeonLayer({ id: 'root', name: 'Root', order: 0 }),
      createFolderLayer({ id: 'folder', name: 'Folder', order: 1 }),
      createDungeonLayer({
        id: 'child',
        name: 'Child',
        order: 2,
        parentId: 'folder',
      }),
    ]);
    expect(wrapper.findAll('.layer-name').map((node) => node.text())).toEqual([
      'Folder',
      'Child',
      'Root',
    ]);
    const rows = wrapper.findAll('.sortable-layer-node');
    expect(rows[0].attributes('style')).toContain('margin-inline-start: 0px');
    expect(rows[1].attributes('style')).toContain('margin-inline-start: 14px');
  });

  it('hides children of collapsed folders and only nests in folders', () => {
    const layers = [
      createDungeonLayer({ id: 'root', name: 'Root', order: 0 }),
      createFolderLayer({
        id: 'folder',
        name: 'Folder',
        order: 1,
        expanded: false,
      }),
      createDungeonLayer({
        id: 'child',
        name: 'Child',
        order: 2,
        parentId: 'folder',
      }),
    ];
    const wrapper = mountTree(layers);
    expect(wrapper.findAll('.layer-name').map((node) => node.text())).toEqual([
      'Folder',
      'Root',
    ]);
    expect(mocks.treeOptions.canNest({}, { layer: layers[1] })).toBe(true);
    expect(mocks.treeOptions.canNest({}, { layer: layers[0] })).toBe(false);
  });

  it('emits flattened layers and the expanded folder on drop', async () => {
    const layers = [
      createDungeonLayer({ id: 'root', name: 'Root', order: 0 }),
      createFolderLayer({
        id: 'folder',
        name: 'Folder',
        order: 1,
        expanded: false,
      }),
      createDungeonLayer({ id: 'child', name: 'Child', order: 2 }),
    ];
    const wrapper = mountTree(layers);
    const childNode = {
      id: 'child',
      layer: layers[2],
    };
    const folderNode = {
      id: 'folder',
      layer: { ...layers[1], children: [childNode] },
      children: [childNode],
    };
    const result = [{ id: 'root', layer: layers[0] }, folderNode];
    let prevented = false;
    mocks.treeOptions.onDrop({
      result: new Map([['map-studio-layers', result]]),
      to: { parentKey: 'folder', index: 0 },
      preventDefault: () => {
        prevented = true;
      },
    });
    expect(prevented).toBe(true);
    const payload = wrapper.emitted('reorder')?.[0]?.[0] as any;
    expect(payload.expandedFolderId).toBe('folder');
    expect(
      payload.layers.map((layer: any) => [layer.id, layer.parentId]),
    ).toEqual([
      ['root', null],
      ['folder', null],
      ['child', 'folder'],
    ]);
    expect(
      (payload.layers.find((layer: any) => layer.id === 'folder') as any)
        .expanded,
    ).toBe(true);
  });

  it('does not emit when the drop has no result', () => {
    const wrapper = mountTree([createDungeonLayer({ id: 'root' })]);
    mocks.treeOptions.onDrop({
      result: new Map(),
      to: { parentKey: null },
      preventDefault: () => undefined,
    });
    expect(wrapper.emitted('reorder')).toBeUndefined();
  });
});

describe('LayerTree root drops', () => {
  it('emits a null expanded folder when dropping at the root', () => {
    const layers = [createDungeonLayer({ id: 'root', name: 'Root', order: 0 })];
    const wrapper = mountTree(layers);
    mocks.treeOptions.onDrop({
      result: new Map([
        ['map-studio-layers', [{ id: 'root', layer: layers[0] }]],
      ]),
      to: { parentKey: null, index: 0 },
      preventDefault: () => undefined,
    });
    const payload = wrapper.emitted('reorder')?.[0]?.[0] as any;
    expect(payload.expandedFolderId).toBeNull();
    expect(payload.layers.map((layer: any) => layer.id)).toEqual(['root']);
  });
});
