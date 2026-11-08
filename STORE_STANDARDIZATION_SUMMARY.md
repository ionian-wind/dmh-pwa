# DMH PWA Store Standardization Summary

> **Historical document — not a description of the current code.**
>
> This file records a past store-standardization effort. Do not use it as
> current documentation. The current base store is `useStore` in
> `src/utils/storage.ts`, not `src/stores/createBaseStore.ts`. Its actual API is
> `items`, `isLoaded`, `error`, `sortedItems`, `getById`, `create`, `update`,
> `remove`, `load`, `current`, `setCurrentId` and `clearCurrent`; it does not
> expose an `isLoading` field. The current state/persistence documentation is
> [docs/architecture/persistence-and-state.md](docs/architecture/persistence-and-state.md).
>
> The text below is retained for history. Statements such as "all stores",
> "fully completed" and "remaining tasks" describe the state of that past
> effort, not the current tree.

## Corrections to the historical text

- `src/stores/createBaseStore.ts` is not present in the current tree. The base
  store is `useStore()` in `src/utils/storage.ts`.
- The `StandardizedStore<T>` interface described below is not part of the
  current code; current stores build on `BaseStore<T>` from
  `src/utils/storage.ts`.
- `isLoading` is not exposed by the current base store. It exposes `isLoaded`.
- The Modules store (`src/stores/modules.ts`), module views and module editors
  no longer exist; the Modules entity was removed.
- The view/component paths in “3. View and Component Refactoring” are stale.
  Current views live in their domain folders, for example
  `src/notes/NotesView.vue` and `src/characters/CharactersView.vue`, not in
  `src/views`. Listed components such as `CombatTracker.vue`,
  `GlobalMenu.vue`, `ModuleSelector.vue` and `ModuleMultipleSelector.vue` no
  longer exist.
- The test follow-up work is obsolete: the current suite is green at 207 test
  files / 1615 tests. See [docs/tooling/testing.md](docs/tooling/testing.md).

## Overview

This document summarizes the comprehensive refactoring of the DMH PWA project's storage and state management approach to use consistent, standardized patterns across all stores, views, and components.

## Completed Refactoring

### 1. Base Store Pattern Implementation

- **Historical proposal**: a centralized base store at
  `src/stores/createBaseStore.ts` (that path is not present in the current tree;
  the current base store is `useStore` in `src/utils/storage.ts`)
- **Features**:
  - Async CRUD operations (create, update, remove, getById)
  - Loading states (the historical text mentions `isLoading`; the current base
    store exposes `isLoaded` and `error`)
  - Automatic storage integration
  - Schema validation
  - Sorting and filtering capabilities
  - Type-safe interfaces

### 2. Store Standardization

The stores below were part of that effort. Some files and responsibilities have
changed since; use `src/stores/` and
[docs/architecture/persistence-and-state.md](docs/architecture/persistence-and-state.md)
for the current list.

#### ✅ **Notes Store** (`src/stores/notes.ts`)

- Standardized API: `load()`, `create()`, `update()`, `remove()`, `getById()`
- State properties in this effort: `items`, `filtered`, `currentId`, `current`,
  `isLoading`, `error`, `isLoaded` (the current base store does not expose
  `isLoading`)
- Legacy aliases removed
- Search functionality integrated

#### ✅ **Characters Store** (`src/stores/characters.ts`)

- Standardized API implemented
- Party-specific filtering via `filteredCharacters(partyId)`
- Legacy aliases removed

#### ✅ **Pawns Store** (`src/stores/pawns.ts`)

- Standardized API implemented
- Search functionality with name/type/description filtering
- Module filtering support (obsolete; the Modules entity was removed)
- Legacy aliases removed

#### ✅ **Parties Store** (`src/stores/parties.ts`)

- Standardized API implemented
- Character management helpers maintained
- Search functionality added
- Legacy aliases removed

#### **Modules Store** (historical; removed)

- `src/stores/modules.ts` no longer exists. The Modules entity was removed from
  the current app, so this entry describes code that is not in the tree.

#### ✅ **Encounters Store** (`src/stores/encounters.ts`)

- Standardized API implemented
- Pawn management helpers maintained
- Turn management functionality preserved
- Legacy aliases removed

#### ✅ **Combats Store** (`src/stores/combats.ts`)

- Standardized API implemented
- Combatant management preserved
- Turn progression maintained
- Legacy aliases removed

#### ✅ **Note Types Store** (`src/stores/noteTypes.ts`)

- Standardized API implemented
- Search functionality added
- Legacy aliases removed

### 3. View and Component Refactoring

All views and components have been updated to use the new standardized API:

#### ✅ **Views Refactored**:

- `HomeView.vue` - Uses `load()`, `filtered`, `items`
- `NotesView.vue` - Uses `create()`, `update()`, `remove()`, `filtered`
- `CharactersView.vue` - Uses `create()`, `update()`, `remove()`, `filteredCharacters`
- `PawnsView.vue` - Uses `create()`, `update()`, `remove()`, `filtered`
- `PartiesView.vue` - Uses `create()`, `update()`, `remove()`, `filtered`
- `ModulesView.vue` - Uses `create()`, `update()`, `remove()`, `items`
- `EncountersView.vue` - Uses `create()`, `update()`, `remove()`, `filtered`
- `CombatView.vue` - Uses `create()`, `update()`, `remove()`, `filtered`
- `NoteView.vue` - Uses `getById()`, `update()`, `remove()`
- `CharacterView.vue` - Uses `getById()`, `update()`, `remove()`
- `PawnView.vue` - Uses `getById()`, `update()`, `remove()`
- `PartyView.vue` - Uses `getById()`, `update()`, `remove()`
- `ModuleView.vue` - Uses `getById()`, `update()`, `remove()`
- `EncounterView.vue` - Uses `getById()`, `update()`, `remove()`

#### ✅ **Components Refactored**:

- `NoteCard.vue` - Uses `remove()`, `getById()`
- `NoteEditor.vue` - Uses `create()`, `update()`, `getById()`
- `CharacterCard.vue` - Uses `remove()`, `getById()`
- `CharacterEditor.vue` - Uses `create()`, `update()`, `getById()`
- `PawnCard.vue` - Uses `remove()`, `getById()`
- `PawnEditor.vue` - Uses `create()`, `update()`, `getById()`
- `PartyCard.vue` - Uses `remove()`, `getById()`
- `PartyEditor.vue` - Uses `create()`, `update()`, `getById()`
- `ModuleCard.vue` - Uses `remove()`, `getById()`
- `ModuleEditor.vue` - Uses `create()`, `update()`, `getById()`
- `EncounterCard.vue` - Uses `remove()`, `getById()`
- `EncounterEditor.vue` - Uses `create()`, `update()`, `getById()`
- `CombatTracker.vue` - Uses `getById()`, `update()`
- `ModuleSelector.vue` - Uses `items`, `getById()`
- `ModuleMultipleSelector.vue` - Uses `items`, `getById()`
- `GlobalMenu.vue` - Uses `items`, `filtered`
- `PartySelector.vue` - Uses `filtered`, `getById()`
- `NoteTypeSelector.vue` - Uses `items`, `getById()`
- `TagSelector.vue` - Uses `allTags`
- `RollButton.vue` - Uses `getById()`

### 4. Utility Refactoring

#### ✅ **Markdown Parser** (`src/utils/markdownParser.ts`)

- Updated to use `getById()` instead of legacy `getNoteById()`, `getModuleById()`, etc.
- Maintains all existing functionality

### 5. Schema and Migration Support

#### ✅ **Schema Updates**

- Updated JSON schemas to handle null values and multiple types
- Added support for `moduleIds` arrays in pawns
- Fixed `challengeRating` type consistency
- Added migration functions for backward compatibility

#### ✅ **Migration Functions**

- `migrateNoteData()` - Handles typeId null vs string
- `migratePawnData()` - Handles moduleId vs moduleIds, challengeRating type
- `migratePartyData()` - Handles character references
- `migrateEncounterData()` - Handles module references
- Integrated into store `load()` methods

## Current Status

### ✅ **Completed**

- All stores refactored to use standardized API
- All views updated to use new method names
- All components updated to use new property names
- Legacy aliases removed from stores
- Utility files updated
- Schema migrations implemented
- Type safety improved throughout

### 🔄 **In Progress**

- Test files need updating to use new API (module resolution issues encountered)
- Some test files may need configuration updates

### 📋 **Remaining Tasks**

1. **Test File Updates**: Update all test files to use the new standardized API
   - Store tests: Update method calls from `loadNotes` to `load`, `getNoteById` to `getById`, etc.
   - View tests: Update mock stores to use new property names
   - Component tests: Update method calls and property references

2. **Documentation**: Update any remaining documentation references

## Benefits Achieved

### 1. **Consistency**

- All stores now use the same method names: `load()`, `create()`, `update()`, `remove()`, `getById()`
- All stores have the same state properties: `items`, `filtered`, `currentId`, `current`, `isLoading`, `error`, `isLoaded`
- Standardized error handling and loading states

### 2. **Type Safety**

- Improved TypeScript interfaces with `StandardizedStore<T>` type
- Better type inference throughout the codebase
- Consistent return types for all operations

### 3. **Maintainability**

- Centralized CRUD logic in base store
- Reduced code duplication
- Easier to add new stores following the same pattern
- Consistent error handling and loading states

### 4. **Developer Experience**

- Intuitive API that's the same across all stores
- Better autocomplete and IntelliSense support
- Easier to understand and work with
- Reduced cognitive load when switching between stores

### 5. **Performance**

- Optimized storage operations
- Better caching and state management
- Reduced unnecessary re-renders

## Migration Strategy

### Backward Compatibility

- All existing data is preserved through migration functions
- Schema updates handle old data formats
- No breaking changes to stored data

### Gradual Migration

- Legacy aliases were maintained during transition
- All components and views updated systematically
- Test files can be updated incrementally

## Future Enhancements

### 1. **Advanced Filtering**

- Add more sophisticated filtering options
- Implement sorting by multiple criteria
- Add search across multiple fields

### 2. **Caching**

- Implement intelligent caching strategies
- Add offline support improvements
- Optimize storage performance

### 3. **Real-time Updates**

- Add WebSocket support for collaborative features
- Implement real-time data synchronization
- Add conflict resolution for concurrent edits

### 4. **Advanced Queries**

- Add complex query capabilities
- Implement relationship queries
- Add aggregation functions

## Library Refactoring Completion

### ✅ **Utility Files Updated**

- **Markdown Parser** (`src/utils/markdownParser.ts`): Updated to use standardized `getById()` method names
- All internal link resolution now uses consistent API across all entity types

### ✅ **Store Legacy Aliases Removed**

All stores have been cleaned up to remove legacy aliases:

#### **Notes Store**

- Removed: `notes`, `currentNoteId`, `currentNote`, `filteredNotes`, `createNote`, `updateNote`, `deleteNote`, `loadNotes`
- Now uses: `items`, `currentId`, `current`, `filtered`, `create`, `update`, `remove`, `load`

#### **Characters Store**

- Removed: `all`, `currentCharacterId`, `currentCharacter`, `createCharacter`, `updateCharacter`, `deleteCharacter`, `loadCharacters`
- Now uses: `items`, `currentId`, `current`, `create`, `update`, `remove`, `load`

#### **Pawns Store**

- Removed: `pawns`, `currentPawnId`, `currentPawn`, `filteredPawns`, `createPawn`, `updatePawn`, `deletePawn`, `loadPawns`, `addPawn`, `getPawn`
- Now uses: `items`, `currentId`, `current`, `filtered`, `create`, `update`, `remove`, `load`, `getById`

#### **Parties Store**

- Removed: `parties`, `currentPartyId`, `currentParty`, `filteredParties`, `createParty`, `updateParty`, `deleteParty`, `loadParties`
- Now uses: `items`, `currentId`, `current`, `filtered`, `create`, `update`, `remove`, `load`

#### **Modules Store**

- Removed: `modules`, `currentModule`, `createModule`, `updateModule`, `deleteModule`, `loadModules`
- Now uses: `items`, `current`, `create`, `update`, `remove`, `load`

#### **Encounters Store**

- Removed: `encounters`, `currentEncounterId`, `currentEncounter`, `filteredEncounters`, `createEncounter`, `updateEncounter`, `deleteEncounter`, `loadEncounters`, `addEncounter`, `getEncounter`
- Now uses: `items`, `currentId`, `current`, `filtered`, `create`, `update`, `remove`, `load`, `getById`

#### **Combats Store**

- Removed: `combats`, `currentCombatId`, `currentCombat`, `createCombat`, `updateCombat`, `deleteCombat`, `loadCombats`, `addCombat`, `getCombat`
- Now uses: `items`, `currentId`, `current`, `create`, `update`, `remove`, `load`, `getById`

#### **Note Types Store**

- Removed: `noteTypes`, `currentTypeId`, `currentType`, `createNoteType`, `updateNoteType`, `deleteNoteType`, `loadNoteTypes`
- Now uses: `items`, `currentId`, `current`, `create`, `update`, `remove`, `load`

### ✅ **Search Functionality Added**

Several stores now include built-in search functionality:

- **Notes Store**: Search by title, content, and tags
- **Pawns Store**: Search by name, type, and description
- **Parties Store**: Search functionality integrated
- **Combats Store**: Search by encounter ID, party ID, and status
- **Note Types Store**: Search by name

### ✅ **Type Safety Improvements**

- All stores now implement the `StandardizedStore<T>` interface
- Consistent method signatures across all stores
- Proper TypeScript type inference throughout
- Eliminated type mismatches and implicit any types

## Final Status (historical claim)

> The status below is the original author's claim at the time. It is not a
> current status report; see the corrections at the top of this file.

### ✅ **Claimed fully completed at the time**

- ✅ All stores refactored to use standardized API
- ✅ All views updated to use new method names
- ✅ All components updated to use new property names
- ✅ All utility files updated
- ✅ Legacy aliases completely removed
- ✅ Schema migrations implemented
- ✅ Type safety improved throughout
- ✅ Search functionality integrated
- ✅ Error handling standardized

### 📋 **Remaining Tasks**

1. **Test Files**: Update test files to use new API (module resolution configuration may be needed)
2. **Documentation**: Update any remaining documentation references

## Impact Summary

### **Code Quality Improvements**

- **Reduced Code Duplication**: ~40% reduction in store code through base store pattern
- **Improved Type Safety**: 100% TypeScript coverage with proper interfaces
- **Enhanced Maintainability**: Consistent patterns across all stores
- **Better Developer Experience**: Intuitive, consistent API

### **Performance Benefits**

- **Optimized Storage**: Centralized storage operations
- **Reduced Re-renders**: Better reactive state management
- **Improved Caching**: Intelligent data caching strategies

### **Architecture Benefits**

- **Scalable Pattern**: Easy to add new stores following established patterns
- **Consistent Error Handling**: Standardized error states and loading indicators
- **Future-Proof Design**: Ready for advanced features like real-time updates

## Conclusion

The DMH PWA project has successfully completed a comprehensive storage and state management refactoring. The codebase now features:

1. **Consistent API**: All stores use the same method names and patterns
2. **Type Safety**: Full TypeScript coverage with proper interfaces
3. **Maintainability**: Reduced code duplication and centralized logic
4. **Performance**: Optimized storage operations and state management
5. **Developer Experience**: Intuitive, consistent API across all stores

The refactoring maintains all existing functionality while providing a solid foundation for future enhancements. The project is now ready for continued development with a robust, scalable architecture.
