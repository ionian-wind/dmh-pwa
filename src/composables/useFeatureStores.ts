import { toValue } from 'vue';
import { featureLinkKinds } from 'virtual:feature-links';

export function useFeatureStores() {
  const stores = Object.fromEntries(
    featureLinkKinds.map((option) => [option.kind, option.useStore()]),
  );

  function store(kind: string) {
    return stores[kind];
  }

  function items(kind: string): any[] {
    const value = toValue(store(kind)?.items);
    return Array.isArray(value) ? value : [];
  }

  function get(kind: string, id: string): any {
    return store(kind)?.getById?.(id) ?? null;
  }

  function has(kind: string): boolean {
    return !!store(kind);
  }

  function load(kinds?: string[]): Promise<unknown> {
    const selected = kinds ?? Object.keys(stores);
    return Promise.all(
      selected.map((kind) => store(kind)?.load?.()).filter(Boolean),
    );
  }

  return { stores, store, items, get, has, load };
}
