import type { StudioLayer } from '@/map-studio/domain/document/types';

export type LayerDropPlacement = 'before' | 'after' | 'inside';

export interface LayerDropPayload {
  layerId: string;
  targetId: string;
  placement: LayerDropPlacement;
}

export function resolveLayerDropMode(
  isFolder: boolean,
  rect: { top: number; height: number },
  pointerY: number,
): LayerDropPlacement {
  if (rect.height <= 0) return 'after';
  const ratio = (pointerY - rect.top) / rect.height;
  if (isFolder && ratio >= 0.3 && ratio <= 0.7) return 'inside';
  return ratio < 0.5 ? 'before' : 'after';
}

function isDescendant(
  layers: Map<string, StudioLayer>,
  candidateId: string,
  ancestorId: string,
): boolean {
  let parentId = layers.get(candidateId)?.parentId ?? null;
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    if (parentId === ancestorId) return true;
    seen.add(parentId);
    parentId = layers.get(parentId)?.parentId ?? null;
  }
  return false;
}

export function reorderLayers(
  layers: StudioLayer[],
  layerId: string,
  targetId: string,
  placement: LayerDropPlacement,
): StudioLayer[] | null {
  if (layerId === targetId) return null;
  const byId = new Map(layers.map((layer) => [layer.id, layer]));
  const dragged = byId.get(layerId);
  const target = byId.get(targetId);
  if (!dragged || !target) return null;
  if (dragged.type === 'background' || target.type === 'background')
    return null;
  if (placement === 'inside' && target.type !== 'folder') return null;
  if (isDescendant(byId, targetId, layerId)) return null;

  const newParentId = placement === 'inside' ? target.id : target.parentId;
  const children = new Map<string | null, StudioLayer[]>();
  for (const layer of layers) {
    if (layer.id === layerId) continue;
    const list = children.get(layer.parentId) ?? [];
    list.push(layer);
    children.set(layer.parentId, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.order - b.order);
  }

  const siblings = children.get(newParentId) ?? [];
  const targetIndex = siblings.findIndex((layer) => layer.id === targetId);
  const index =
    placement === 'inside'
      ? siblings.length
      : targetIndex < 0
        ? siblings.length
        : targetIndex + (placement === 'after' ? 1 : 0);
  siblings.splice(index, 0, { ...dragged, parentId: newParentId });
  children.set(newParentId, siblings);

  const ordered: StudioLayer[] = [];
  const visit = (parentId: string | null) => {
    for (const layer of children.get(parentId) ?? []) {
      ordered.push(layer);
      if (layer.type === 'folder') visit(layer.id);
    }
  };
  visit(null);
  if (ordered.length !== layers.length) return null;

  return ordered.map((layer, order) => {
    if (layer.id === layerId) {
      return { ...dragged, parentId: newParentId, order } as StudioLayer;
    }
    if (
      placement === 'inside' &&
      layer.id === targetId &&
      layer.type === 'folder'
    ) {
      return { ...layer, order, expanded: true };
    }
    return { ...layer, order } as StudioLayer;
  });
}
