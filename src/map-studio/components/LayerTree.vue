<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { makeSortableTree, type Key } from '@vue-dnd-kit/core';
import SortableLayerNode from '@/map-studio/components/SortableLayerNode.vue';
import type { StudioLayer } from '@/map-studio/domain/document/types';
import {
  buildLayerTree,
  flattenLayerTree,
  type LayerTreeNode,
} from '@/map-studio/domain/layerTree';

const props = defineProps<{
  layers: StudioLayer[];
}>();

const emit = defineEmits<{
  (
    e: 'reorder',
    payload: { layers: StudioLayer[]; expandedFolderId: string | null },
  ): void;
}>();

const INDENT = 14;
const TREE_ID = 'map-studio-layers';

const treeRef = useTemplateRef<HTMLElement>('tree');
const nodes = computed(() => buildLayerTree(props.layers));
const collapsed = computed<ReadonlySet<Key>>(
  () =>
    new Set(
      props.layers
        .filter((layer) => layer.type === 'folder' && !layer.expanded)
        .map((layer) => layer.id),
    ),
);

const { items } = makeSortableTree(treeRef, {
  id: TREE_ID,
  items: () => nodes.value,
  indentation: INDENT,
  maxDepth: 6,
  nesting: 'both',
  collapsed,
  canNest: (_node, parent) => parent.layer.type === 'folder',
  onDrop: (event) => {
    event.preventDefault();
    const result = event.result.get(TREE_ID) as LayerTreeNode[] | undefined;
    if (!result) return;
    const parentKey =
      event.to.parentKey === null ? null : String(event.to.parentKey);
    emit('reorder', {
      layers: flattenLayerTree(result, parentKey),
      expandedFolderId: parentKey,
    });
  },
});
</script>

<template>
  <div ref="tree" class="studio-layer-tree">
    <SortableLayerNode
      v-for="node in items"
      :key="node.key"
      :node="node"
      :indent="INDENT"
      :disabled="node.item.layer.type === 'background'"
    >
      <slot
        name="row"
        :node="node"
        :layer="node.item.layer"
        :depth="node.depth"
      />
    </SortableLayerNode>
  </div>
</template>

<style scoped>
.studio-layer-tree {
  display: flex;
  flex-direction: column;
}
</style>
