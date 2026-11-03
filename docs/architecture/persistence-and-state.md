# Persistence and State Management

This part covers the storage engine, the base store, the Pinia domain stores,
schema validation, migrations, and backup/restore. It is the most load-bearing
subsystem in the app: every feature goes through it.

## 1. IndexedDB

**Database:** `dmh-db` (`src/utils/storage.ts`).

Object stores are created lazily by migrations. Current stores:

| Store                  | Owner               | Schema-validated         |
| ---------------------- | ------------------- | ------------------------ |
| `characters`           | `stores/characters` | `character.schema.json`  |
| `monsters`             | `stores/monsters`   | `monster.schema.json`    |
| `notes`                | `stores/notes`      | `note.schema.json`       |
| `noteTypes`            | `stores/noteTypes`  | `noteType.schema.json`   |
| `parties`              | `stores/parties`    | `party.schema.json`      |
| `modules`              | `stores/modules`    | `module.schema.json`     |
| `encounters`           | `stores/encounters` | `encounter.schema.json`  |
| `combats`              | `stores/combats`    | `combat.schema.json`     |
| `bookmarks`            | `stores/bookmarks`  | `bookmark.schema.json`   |
| `timers`               | `stores/timers`     | `timer.schema.json`      |
| `indexations_mentions` | `useMentionsStore`  | no                       |
| `jukebox_playlists`    | `jukebox/stores`    | no (explicitly bypassed) |
| `jukebox_tracks`       | `jukebox/stores`    | no                       |
| `jukebox_files`        | `jukebox/stores`    | no                       |
| `migrations`           | migration runner    | no                       |

All stores use `keyPath: 'id'` with `autoIncrement: false`; the application
generates IDs.

### Connection helper

`openDB()` computes the schema version as the maximum migration version, then
passes an `upgrade` callback to `idb.openDB`. During upgrade it:

1. Ensures the `migrations` store exists.
2. Selects migrations with `version > oldVersion && version <= newVersion`.
3. Creates every store listed in `affectedStores`.
4. Runs migrations sequentially through a promise chain and records each
   applied migration (`id`, `version`, `name`, `appliedAt`) in `migrations`.

**Caveat:** the promise chain is not returned from `upgrade`. IndexedDB's
`versionchange` transaction stays open while requests are pending, but the
chain is asynchronous and the upgrade callback itself returns immediately. With
the current no-op migrations this works in practice; a migration that awaits
non-IDB work or issues requests after an `await` risks a
`TransactionInactiveError`. A production-grade runner should await a single
promise passed to `event.waitUntil`-style handling or use `idb`'s transaction
lifetime rules explicitly.

### Low-level helpers

- `idbGetItem(store, id)`
- `idbPutItem(store, item)` — validates first if a schema is registered.
- `idbDeleteItem(store, id)`
- `idbGetAllItems(store)`
- `clearStore(store)` — deletes keys then awaits `tx.done`.

`idbPutItem` throws `StorageError` when Ajv reports errors. No view catches
these specifically; they surface as rejected promises.

## 2. Schema validation

`src/utils/schemaValidator.ts` wraps Ajv (`allErrors: true`).

```
registerValidationSchema(name, schema)  → ajv.addSchema(schema, name)
canValidate(name)                       → ajv.getSchema(name) !== undefined
validateSchema(name, data)              → { valid, errors[] }
validateArray(name, data)               → all items valid
getValidationErrors / getArrayValidationErrors
```

Stores register their schema by passing it to `useStore`; the store name is the
schema key. Validation happens in `idbPutItem`, i.e. on every `create` and
`update`. Consequences:

- `load()` does not validate; malformed legacy data is accepted into memory.
- Jukebox stores deliberately pass `validationSchema: undefined`.
- Direct imports (`importModuleFromZip`, `restoreAllStores` uses `idbPutItem`)
  need special attention: module import writes through a raw transaction and
  therefore **bypasses validation entirely**.
- Ajv is configured without `strict: false` or formats; date-like strings are
  just strings.

## 3. Base store

`useStore<T>({ storeName, validationSchema })` returns a cached object
(`storeCache` keyed by store name) with:

| Member                         | Type                        | Behavior                                                              |
| ------------------------------ | --------------------------- | --------------------------------------------------------------------- |
| `items`                        | `Ref<T[]>`                  | Full in-memory list                                                   |
| `isLoaded`                     | `Ref<boolean>`              | Set after first successful load                                       |
| `error`                        | `Ref<Error \| null>`        | Last load error                                                       |
| `sortedItems`                  | `ComputedRef<T[]>`          | Copy sorted by `updatedAt` desc                                       |
| `getById`                      | `(id) => T \| null`         | Linear scan                                                           |
| `create`                       | `(data) => Promise<T>`      | Deep-unwraps, adds ID/timestamps, validates, persists, pushes         |
| `update`                       | `(id, patch) => Promise<T>` | Merges plain original + patch, bumps `updatedAt`, validates, persists |
| `remove`                       | `(id) => Promise<void>`     | Deletes from IDB and memory, clears current if matching               |
| `load`                         | `() => Promise<void>`       | Replaces `items` with `getAll()`                                      |
| `current`                      | `ComputedRef<T \| null>`    | Based on internal `currentId`                                         |
| `setCurrentId`, `clearCurrent` | functions                   | Selection helpers                                                     |

Important consequences:

- `load()` **replaces** the array, discarding unsaved UI-only changes.
- `update()` requires the item to already exist in memory (`Item not found`).
- `current` is rarely used by views; they resolve items from route params
  instead.
- Because the object is cached per store name, two Pinia stores that call
  `useStore('notes')` share the same refs. This is intentional and also why
  Pinia `$reset` cannot fully reset underlying storage.

## 4. Pinia domain stores

All domain stores are **setup stores** that wrap a base store and add
domain-specific state/helpers, then spread the base store:

```ts
export const useNoteStore = defineStore('notes', () => {
  const base = useStore<Note>({ storeName: 'notes', validationSchema: noteSchema });
  ...
  return { ...base, filtered, create, update, remove, ... };
});
```

| Store               | ID           | Extra behavior                                                                                |
| ------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| `useNoteStore`      | `notes`      | Search/tag filter, `allTags`, mention index sync on create/update/remove, `hidden` protection |
| `useCharacterStore` | `characters` | Name search                                                                                   |
| `useMonsterStore`   | `monsters`   | Name search                                                                                   |
| `usePartyStore`     | `parties`    | Name search                                                                                   |
| `useModuleStore`    | `modules`    | Name search, `getModuleName`                                                                  |
| `useEncounterStore` | `encounters` | Name search                                                                                   |
| `useCombatStore`    | `combats`    | Combatant/turn helpers, `startCombat`, `endCombat`, `resetCombat`, `nextTurn`, `previousTurn` |
| `useNoteTypeStore`  | `noteTypes`  | Name search                                                                                   |
| `useBookmarkStore`  | `bookmarks`  | `findByModuleAndAnchor`, `isBookmarked`, `addBookmark`, `removeBookmark`                      |
| `useTimerStore`     | `timers`     | `init`, `start/stop/reset`, ticking `now` ref, completion notifications                       |

### Filtering

Every list store exposes `filtered`, `setFilter`, `clearFilter`,
`setSearchQuery`, and `searchQuery`. `BaseListView` forwards search props to
`ViewHeader`, and the searchable list views bind them to their domain store;
`NotesView` additionally supports the URL tag filter.

### Mention indexing (notes store)

`noteStore.create/update` call `extractMentionedEntities(content)` and
`indexation.setLinks({kind:'note', id}, mentions)`. `remove` calls
`clearLinks`. The index is the only cross-entity relationship that is
maintained automatically.

### Timer store

The timer store is special:

- `init()` loads timers and starts `checkFinishedTimers()` exactly once per
  module lifetime (`counter` flag).
- `checkFinishedTimers` updates `nowRef`, walks all timers, marks expired ones
  `finished`, shows a Quasar `Notify` toast, then schedules itself again after
  1 second. **It keeps polling even when no timer is running**, and the timeout
  is never cleared.
- `start` sets `startedAt = Date.now()` and `status = 'running'`.
- `stop` clears `startedAt` and sets `inactive` (elapsed time is discarded).
- `reset` is an alias for `start`.

The global tick is consumed by `App.vue` (animated clock icon) and
`TimerListItem` (countdown display).

## 5. Configuration store

`src/utils/configStore.ts` is a Pinia store with **manual localStorage
persistence** rather than `pinia-plugin-persistedstate`.

- Keys are prefixed `dmh-config:`.
- `getValue` JSON-parses; invalid JSON throws during store creation.
- A `watch` per key writes changes back.
- Values: `jukeboxLastTrackId`, `jukeboxLastTrackProgress`,
  `jukeboxLastVolume`, `jukeboxActivePlaylistId`, `jukeboxRepeatMode`,
  `jukeboxShuffle`, `jukeboxSmoothTrackChange`,
  `jukeboxAnimatePlayerBackground`, `jukeboxDisplayCoverWhilePlaying`,
  `confirmDelete`, `savedLanguage`.
- `savedLanguage` defaults to `window.navigator.language`.

`pinia-shared-state` is also active, so these stores are synchronized between
tabs when the browser supports it. There is no conflict resolution beyond
last-write-wins.

## 6. Migrations

Types in `src/types/migration.ts`:

```ts
interface Migration {
  version: number;
  name: string;
  affectedStores: string[];
  go(transaction): Promise<void>;
}
```

Current migrations:

| Version | File                           | Effect                                |
| ------- | ------------------------------ | ------------------------------------- |
| 1       | `0000000001_initial_schema.ts` | Declares all core stores (no-op `go`) |
| 2       | `0000000002_bookmarks.ts`      | Adds `bookmarks`                      |
| 3       | `0000000003_timers.ts`         | Adds `timers`                         |

Sorted in `src/migrations/index.ts`. The version is the max migration number;
adding a migration requires adding it to the `migrations` array (the generator
reminds you, but does not edit the index).

Data-shape migrations (renames, defaults) are not implemented anywhere; all
existing migrations only create stores.

## 7. Backup and restore

`backupAllStores()` zips each store in `MAIN_STORE_NAMES` as
`<store>.json` (pretty-printed array).

`MAIN_STORE_NAMES` contains every object store:
`characters, combats, encounters, monsters, modules, notes, noteTypes,
parties, bookmarks, timers, jukebox_playlists, jukebox_tracks, jukebox_files,
indexations_mentions`.

Backup encoding:

- Normal records are written as JSON.
- `jukebox_files` Blob sources are base64-encoded as `source.kind: 'blob-data'`.
- FileSystem handles cannot be serialized; they are written as
  `source.kind: 'unavailable'` and may need relinking after restore.

`restoreAllStores(blob)` iterates the same list, clears each store, and writes
items one by one with validation. Restore is not a single cross-store
transaction; an invalid item can leave a partially cleared database.
HomeView reloads the page after a successful restore so every store, timer,
bookmark, jukebox record, and mention index is refreshed.

## 8. State-flow summary

```mermaid
sequenceDiagram
  participant View
  participant DomainStore
  participant BaseStore
  participant Ajv
  participant IDB
  View->>DomainStore: load()
  DomainStore->>BaseStore: load()
  BaseStore->>IDB: getAll(store)
  IDB-->>BaseStore: rows
  BaseStore-->>DomainStore: items.value = rows
  View->>DomainStore: create(data)
  DomainStore->>BaseStore: create(data)
  BaseStore->>BaseStore: deepUnwrap + id + timestamps
  BaseStore->>Ajv: validate(store, item)
  Ajv-->>BaseStore: valid / errors
  BaseStore->>IDB: put(item)
  BaseStore-->>DomainStore: new item
  DomainStore->>DomainStore: update mention index (notes only)
  DomainStore-->>View: reactive update
```

## 9. Known persistence limitations

- No transactions across multiple stores for domain operations.
- No referential integrity or cascade cleanup.
- No optimistic conflict handling between tabs; `pinia-shared-state` replaces
  whole store state, which can overwrite in-flight edits.
- `load()` races can overwrite newer in-memory state if two views load the
  same store concurrently (the last `getAll` wins).
- IndexedDB quota errors are not surfaced to the user.
- Backup format is not versioned and has no manifest/checksum.

See [proposals/technical-proposals.md](../proposals/technical-proposals.md)
for a repository/unit-of-work proposal.
