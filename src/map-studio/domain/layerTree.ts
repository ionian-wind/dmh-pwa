import type { StudioLayer } from '@/map-studio/domain/document/types';

export interface LayerTreeNode {
  id: string;
  layer: StudioLayer;
  children?: LayerTreeNode[];
}

export function buildLayerTree(layers: StudioLayer[]): LayerTreeNode[] {
  const byParent = new Map<string | null, StudioLayer[]>();
  for (const layer of layers) {
    const list = byParent.get(layer.parentId) ?? [];
    list.push(layer);
    byParent.set(layer.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order);
  }
  const build = (parentId: string | null): LayerTreeNode[] =>
    (byParent.get(parentId) ?? []).map((layer) => {
      const children = build(layer.id);
      return {
        id: layer.id,
        layer,
        ...(children.length ? { children } : {}),
      };
    });
  return build(null);
}

export function flattenLayerTree(
  nodes: LayerTreeNode[],
  expandedFolderId: string | null = null,
): StudioLayer[] {
  const ordered: StudioLayer[] = [];
  const visit = (items: LayerTreeNode[], parentId: string | null) => {
    for (const node of items) {
      if (node.layer.type === 'folder') {
        ordered.push({
          ...node.layer,
          parentId,
          expanded: expandedFolderId === node.id ? true : node.layer.expanded,
        });
      } else {
        ordered.push({ ...node.layer, parentId });
      }
      if (node.children?.length) visit(node.children, node.id);
    }
  };
  visit(nodes, null);
  return ordered.map((layer, order) => ({ ...layer, order }));
}
