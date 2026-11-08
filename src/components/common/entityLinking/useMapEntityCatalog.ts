import { computed, onMounted, toValue } from 'vue';
import {
  MAP_ENTITY_KIND_OPTIONS,
  type MapEntityKindOption,
} from '@/components/common/entityLinking/entityRefs';
import type { MapEntityRef } from '@/maps/types';
import { noteDisplayTitle } from '@/utils/noteTitle';

export interface MapEntityCatalogGroup extends MapEntityKindOption {
  items: Array<{ id: string; label: string }>;
}

export function useMapEntityCatalog() {
  const stores = new Map(
    MAP_ENTITY_KIND_OPTIONS.map((option) => [option.kind, option.useStore()]),
  );

  onMounted(() => {
    void Promise.all(
      [...stores.values()].map((store) =>
        toValue(store.isLoaded)
          ? undefined
          : store.load().catch(() => undefined),
      ),
    );
  });

  const groups = computed<MapEntityCatalogGroup[]>(() =>
    MAP_ENTITY_KIND_OPTIONS.map((option) => {
      const store = stores.get(option.kind);
      const storedItems = toValue(store?.items as any);
      const items = (Array.isArray(storedItems) ? storedItems : []).map(
        (item) => ({
          id: item.id,
          label:
            option.kind === 'note'
              ? noteDisplayTitle(item) || String(item.id)
              : String(item[option.titleField] || item.id),
        }),
      );
      return { ...option, items };
    }),
  );

  function getLabel(ref: MapEntityRef): string {
    const group = groups.value.find((entry) => entry.kind === ref.kind);
    return group?.items.find((item) => item.id === ref.id)?.label || ref.id;
  }

  function getEntity(ref: MapEntityRef): any | undefined {
    const store = stores.get(ref.kind);
    if (!store) return undefined;

    const byId = store.getById?.(ref.id);
    if (byId) return byId;

    const storedItems = toValue(store.items as any);
    return Array.isArray(storedItems)
      ? storedItems.find((item) => item.id === ref.id)
      : undefined;
  }

  return { groups, getLabel, getEntity };
}
