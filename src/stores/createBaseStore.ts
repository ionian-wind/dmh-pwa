import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useStorage, generateId } from '@/utils/storage';

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface BaseStoreOptions<T extends BaseEntity> {
  storageKey: string;
  defaultValue?: T[];
  validate?: (data: unknown) => data is T[];
  schema?: string;
}

// Base store interface that all concrete stores should implement
export interface BaseStore<T extends BaseEntity> {
  // State
  items: Ref<T[]>;
  isLoading: Ref<boolean>;
  isLoaded: Ref<boolean>;
  error: Ref<Error | null>;
  
  // Getters
  sortedItems: ComputedRef<T[]>;
  getById: (id: string) => T | null;
  
  // Actions
  create: (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<T>;
  update: (id: string, item: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  load: () => Promise<T[]>;
}

// Standardized store interface that concrete stores should implement
export interface StandardizedStore<T extends BaseEntity> extends BaseStore<T> {
  // Additional common properties that most stores have
  currentId?: Ref<string | null>;
  current?: ComputedRef<T | null>;
  filtered?: ComputedRef<T[]>;
  
  // Allow additional properties for store-specific functionality
  [key: string]: any;
}

export function createBaseStore<T extends BaseEntity>(options: BaseStoreOptions<T>) {
  const {
    storageKey,
    defaultValue = [],
    validate,
    schema
  } = options;

  return () => {
    // Base state
    const [items, loaded] = useStorage<T[]>({
      key: storageKey,
      defaultValue,
      validate,
      schema
    });

    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    // Base getters
    const sortedItems = computed(() => {
      return [...items.value].sort((a, b) => b.updatedAt - a.updatedAt);
    });

    const getById = (id: string): T | null => {
      return items.value.find(item => item.id === id) || null;
    };

    // Base actions
    const create = async (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> => {
      const newItem = {
        ...item,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as T;

      items.value = [...items.value, newItem];
      return newItem;
    };

    const update = async (id: string, item: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T> => {
      const index = items.value.findIndex(i => i.id === id);
      if (index === -1) {
        throw new Error(`Item with id ${id} not found`);
      }

      const updatedItem = {
        ...items.value[index],
        ...item,
        updatedAt: Date.now()
      } as T;

      items.value = [
        ...items.value.slice(0, index),
        updatedItem,
        ...items.value.slice(index + 1)
      ];
      return updatedItem;
    };

    const remove = async (id: string): Promise<void> => {
      const index = items.value.findIndex(i => i.id === id);
      if (index === -1) {
        throw new Error(`Item with id ${id} not found`);
      }

      items.value = [
        ...items.value.slice(0, index),
        ...items.value.slice(index + 1)
      ];
    };

    const load = async (): Promise<T[]> => {
      isLoading.value = true;
      error.value = null;
      try {
        // This is where you would typically make an API call
        // For now, we just return the items from storage
        return items.value;
      } catch (e) {
        error.value = e instanceof Error ? e : new Error(String(e));
        throw error.value;
      } finally {
        isLoading.value = false;
      }
    };

    return {
      // State
      items,
      isLoading,
      isLoaded: loaded,
      error,

      // Getters
      sortedItems,
      getById,

      // Actions
      create,
      update,
      remove,
      load
    };
  };
} 