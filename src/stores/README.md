# Store Architecture Documentation

## Overview

This document describes the standardized store architecture used throughout the DMH PWA application. All stores follow a consistent pattern to ensure maintainability, type safety, and developer experience.

## Base Types and Interfaces

### BaseEntity

All entities in the application extend this base interface:

```typescript
interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}
```

### BaseStore

The core interface that all stores implement:

```typescript
interface BaseStore<T extends BaseEntity> {
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
  update: (
    id: string,
    item: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => Promise<T>;
  remove: (id: string) => Promise<void>;
  load: () => Promise<T[]>;
}
```

### StandardizedStore

Extended interface for concrete stores with additional common properties:

```typescript
interface StandardizedStore<T extends BaseEntity> extends BaseStore<T> {
  // Additional common properties that most stores have
  currentId?: Ref<string | null>;
  current?: ComputedRef<T | null>;
  filtered?: ComputedRef<T[]>;

  // Allow additional properties for store-specific functionality
  [key: string]: any;
}
```

## Standardized Method Names

All stores now use consistent method names across the application:

### Core CRUD Operations

- `create(item)` - Create a new entity
- `update(id, item)` - Update an existing entity
- `remove(id)` - Delete an entity
- `getById(id)` - Get entity by ID
- `load()` - Load all entities (with migration support)

### Common State Properties

- `items` - Array of all entities
- `isLoading` - Loading state
- `isLoaded` - Whether data has been loaded
- `error` - Error state
- `sortedItems` - Entities sorted by updatedAt (newest first)
- `currentId` - Currently selected entity ID
- `current` - Currently selected entity
- `filtered` - Filtered entities (if applicable)

## Store Implementation Pattern

### 1. Base Store Creation

```typescript
const baseStore = createBaseStore<EntityType>({
  storageKey: 'storage-key',
  validate: (data): data is EntityType[] => /* validation logic */,
  schema: 'schema-name'
});
```

### 2. Store Definition

```typescript
export const useEntityStore = defineStore(
  'entities',
  (): StandardizedStore<EntityType> => {
    const base = baseStore();
    const currentId = ref<string | null>(null);

    // Computed properties
    const current = computed(() => {
      if (!currentId.value) return null;
      return base.getById(currentId.value) || null;
    });

    const filtered = computed(() => {
      // Store-specific filtering logic
      return base.items.value.filter(/* ... */);
    });

    // Standardized CRUD operations
    const create = async (
      item: Omit<EntityType, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      const newItem = await base.create(item);
      // Additional logic (e.g., mentions, indexing)
      return newItem;
    };

    const update = async (
      id: string,
      item: Partial<Omit<EntityType, 'id' | 'createdAt' | 'updatedAt'>>,
    ) => {
      const updatedItem = await base.update(id, item);
      // Additional logic
      return updatedItem;
    };

    const remove = async (id: string) => {
      await base.remove(id);
      if (currentId.value === id) currentId.value = null;
      // Additional cleanup logic
    };

    const load = async () => {
      // Migration logic if needed
      return base.load();
    };

    return {
      // Base store properties
      items: base.items,
      isLoading: base.isLoading,
      isLoaded: base.isLoaded,
      error: base.error,
      sortedItems: base.sortedItems,

      // Extended state
      currentId,
      current,
      filtered,

      // Actions
      create,
      update,
      remove,
      getById: base.getById,
      load,

      // Store-specific helpers
      // ...

      // Legacy aliases for backward compatibility
      // ...
    };
  },
);
```

## Migration Support

All stores support automatic data migration through the `load()` method:

```typescript
const load = async () => {
  // Run migration first if data exists but validation fails
  try {
    const migratedData = await migrateStorageData(
      'storage-key',
      migrateFunction,
      [],
    );
    if (migratedData.length > 0 && base.items.value.length === 0) {
      base.items.value = migratedData;
      console.log(`[Store] Migrated ${migratedData.length} items`);
    }
  } catch (e) {
    console.warn('[Store] Migration failed:', e);
  }

  // Then load normally
  return base.load();
};
```

## Backward Compatibility

All stores maintain backward compatibility through legacy aliases:

```typescript
// Legacy aliases for backward compatibility
items: base.items,
currentEntityId: currentId,
currentEntity: current,
filteredEntities: filtered,
createEntity: create,
updateEntity: update,
deleteEntity: remove,
loadEntities: load,
```

## Store-Specific Features

### Notes Store

- Mentions indexing and linking
- Tag management
- Search functionality
- Module filtering

### Characters Store

- Party association
- Party filtering

### Monsters Store

- Module filtering (multiple modules)
- Challenge rating management

### Parties Store

- Character management (legacy)
- Module filtering (multiple modules)

### Modules Store

- Module filtering system
- Filter state management

### Encounters Store

- Monster management
- Turn tracking
- Module association

### Combats Store

- Combatant management
- Turn tracking
- Status management
- Encounter/Party association

### NoteTypes Store

- Simple CRUD operations
- Current type management

## Best Practices

### 1. Type Safety

- Always use proper TypeScript types
- Extend BaseEntity for all entities
- Use StandardizedStore interface for store return types

### 2. Error Handling

- Implement proper error handling in CRUD operations
- Use the error state for user feedback
- Log errors appropriately

### 3. Loading States

- Use isLoading for operation feedback
- Use isLoaded to prevent unnecessary reloads
- Show loading indicators in UI

### 4. Data Validation

- Implement proper validation functions
- Use JSON schemas for runtime validation
- Handle migration gracefully

### 5. Performance

- Use computed properties for derived state
- Implement proper filtering logic
- Avoid unnecessary re-renders

### 6. Storage

- Use consistent storage keys
- Implement proper migration strategies
- Handle storage errors gracefully

## Future Enhancements

### 1. API Integration

- Replace local storage with API calls
- Implement proper caching strategies
- Add offline support

### 2. Real-time Updates

- WebSocket integration for live updates
- Optimistic updates
- Conflict resolution

### 3. Advanced Filtering

- Search across multiple fields
- Advanced filtering options
- Saved filters

### 4. Bulk Operations

- Bulk create/update/delete
- Batch operations
- Progress tracking

### 5. Data Export/Import

- Export to various formats
- Import from external sources
- Data backup/restore

## Migration Guide

When updating existing stores to use the new standardized pattern:

1. **Import the base types**:

   ```typescript
   import { createBaseStore, type StandardizedStore } from './createBaseStore';
   ```

2. **Update store definition**:

   ```typescript
   export const useStore = defineStore('store', (): StandardizedStore<EntityType> => {
   ```

3. **Rename methods to standardized names**:
   - `createEntity` → `create`
   - `updateEntity` → `update`
   - `deleteEntity` → `remove`
   - `loadEntities` → `load`

4. **Rename state properties**:
   - `currentEntityId` → `currentId`
   - `currentEntity` → `current`
   - `filteredEntities` → `filtered`

5. **Add legacy aliases** for backward compatibility

6. **Update method signatures** to match the standardized interface

7. **Test thoroughly** to ensure all functionality works correctly

## Conclusion

This standardized store architecture provides:

- **Consistency** across all stores
- **Type safety** with proper TypeScript interfaces
- **Maintainability** through shared patterns
- **Backward compatibility** for existing code
- **Extensibility** for future features
- **Performance** through optimized patterns

All stores now follow the same patterns, making the codebase more maintainable and developer-friendly.
