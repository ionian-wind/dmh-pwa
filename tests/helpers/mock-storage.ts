import { computed, ref } from 'vue';
import { vi } from 'vitest';

export const mentionsMock = {
  setLinks: vi.fn().mockResolvedValue(undefined),
  clearLinks: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue(undefined),
  getLinks: vi.fn(() => []),
  getBacklinks: vi.fn(() => []),
  addLink: vi.fn(),
  removeLink: vi.fn(),
  clearAll: vi.fn(),
};

const bases = new Map<string, any>();
let idCounter = 0;

function createBase(items: any[] = []) {
  const state = ref<any[]>(items.map((item) => ({ ...item })));
  const currentId = ref<string | null>(null);

  const getById = (id: string) =>
    state.value.find((item) => item.id === id) || null;

  const current = computed(() =>
    currentId.value ? getById(currentId.value) : null,
  );
  const sortedItems = computed(() =>
    [...state.value].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
  );

  return {
    items: state,
    isLoaded: ref(true),
    error: ref(null),
    sortedItems,
    current,
    getById,
    create: vi.fn(async (data: any) => {
      const now = Date.now();
      const item = {
        ...data,
        id: data.id || `mock-${++idCounter}`,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };
      state.value.push(item);
      return item;
    }),
    update: vi.fn(async (id: string, patch: any) => {
      const index = state.value.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Item not found');
      const updated = {
        ...state.value[index],
        ...patch,
        updatedAt: Date.now(),
      };
      state.value[index] = updated;
      return updated;
    }),
    remove: vi.fn(async (id: string) => {
      state.value = state.value.filter((item) => item.id !== id);
    }),
    load: vi.fn(async () => state.value),
    setCurrentId: (id: string | null) => {
      currentId.value = id;
    },
    clearCurrent: () => {
      currentId.value = null;
    },
  };
}

export function resetMockStores() {
  bases.clear();
  idCounter = 0;
  vi.clearAllMocks();
}

export function seedMockStore(storeName: string, items: any[]) {
  const base = createBase(items);
  bases.set(storeName, base);
  return base;
}

export function useStore(options: { storeName: string }) {
  if (!bases.has(options.storeName)) {
    bases.set(options.storeName, createBase());
  }
  return bases.get(options.storeName);
}

export function useMentionsStore() {
  return mentionsMock;
}

export function generateId() {
  return `mock-${++idCounter}`;
}

export async function openDB() {
  throw new Error('openDB is not available in the mock storage helper');
}

export const MAIN_STORE_NAMES: string[] = [];
