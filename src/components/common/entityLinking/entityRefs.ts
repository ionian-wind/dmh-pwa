import { featureLinkKinds } from 'virtual:feature-links';
import type { Ref } from 'vue';
import type { MapEntityKind, MapEntityRef } from '@/maps/types';

export type EntityTitleField = 'title' | 'name';

export interface MapEntityKindOption {
  kind: MapEntityKind;
  labelKey: string;
  titleField: EntityTitleField;
  editor?: () => Promise<any>;
  create?: (payload: any) => Promise<{ id: string; label: string } | null>;
  route?: (id: string) => string;
  useStore: () => {
    items: any[] | Ref<any[]>;
    isLoaded?: boolean | Ref<boolean>;
    load: () => Promise<unknown>;
    getById?: (id: string) => any;
  };
}

export const MAP_ENTITY_KIND_OPTIONS =
  featureLinkKinds as unknown as MapEntityKindOption[];

export function getEntityKindOption(
  kind: string,
): MapEntityKindOption | undefined {
  return MAP_ENTITY_KIND_OPTIONS.find((option) => option.kind === kind);
}

export function entityRoute(kind: string, id: string): string | undefined {
  return getEntityKindOption(kind)?.route?.(id);
}

export function entityRefKey(ref: MapEntityRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function dedupeEntityRefs(refs: MapEntityRef[]): MapEntityRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = entityRefKey(ref);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
