# Utility Helpers

Small, mostly pure helpers used across the app.

## `src/utils/debug.ts`

```ts
debug(...args)       // console.log
debugWarn(...args)   // console.warn
debugError(...args)  // console.error
exposeConsole()      // replaces global console with node:console (tests)
```

Every module uses these instead of `console.*`; the remaining direct `console`
calls are in WIP dice-engine debug branches. There is no log level or
production stripping.

## `src/utils/deepUnwrap.ts`

Recursively converts Vue reactive/proxy/ref values into plain objects before
persistence.

Rules:
- Preserves `Blob` and anything whose constructor name is
  `FileSystemFileHandle`/`FileSystemDirectoryHandle`.
- Arrays map recursively.
- Ref objects (`__v_isRef`) unwrap `.value`.
- Reactive objects use `toRaw` first.
- Functions become `undefined`.
- Other objects are shallow-copied with recursively unwrapped values.

Caveats:
- `Date`, `Map`, `Set`, `File`, and typed arrays are not special-cased (only
  `Blob`); they are turned into plain objects or lose their prototype.
- The `typeof obj === 'function'` check is inside the object branch, so actual
  functions at the top level are returned as-is rather than dropped.
- Cyclic references cause infinite recursion.

## `src/utils/schemaValidator.ts`

See [architecture/persistence-and-state.md](../architecture/persistence-and-state.md#2-schema-validation).
Exports Ajv wrappers: `registerValidationSchema`, `canValidate`,
`validateSchema`, `getValidationErrors`, `validateArray`,
`getArrayValidationErrors`.

`validateArray` has a bug: `results.every(Boolean)` checks the result objects
(always truthy), so it returns `true` for any array even if items are invalid.
The function is not used by the current stores.

## `src/utils/anchorScroll.ts`

`setupAnchorScrollHandler()`:

- Registers a `popstate` listener that reads `window.location.hash` and scrolls
  the matching element into view.
- On initial load with a hash, polls every 100ms up to 20 times (2s) for the
  element, then scrolls smoothly.

Bug: the guard `pathname === window.location.pathname` compares a value with
itself and is always true. It should compare against a saved/current route
path.

## `src/utils/scrollToHeading.ts`

```ts
scrollToHeading(id, router, heading?)
```

- Replaces the router hash when it differs.
- Scrolls the element into view smoothly and applies a `highlight-anchor` class
  for 1.2s.
- Does nothing if no element is passed, aside from updating the hash.

## `src/utils/cropTitle.ts`

```ts
cropTitle(title, max = 25)
```

Returns the title unchanged if short, otherwise the first `max` characters plus
`…`. No word-boundary awareness. Throws if `title` is not a string.

## `src/utils/random.ts`

```ts
rng() => Math.random()
getRandomInt(max) => Math.floor(rng() * max)
```

Used for shuffle and table rolls (dice engine, WIP). No seedable RNG, so
results are not reproducible and tests must mock randomness.

## `src/utils/configStore.ts`

A Pinia config store with manual localStorage persistence:

- Prefix `dmh-config:`.
- `getValue` JSON parses and throws on malformed values.
- Each key is watched and written back.
- Values listed in
  [architecture/persistence-and-state.md](../architecture/persistence-and-state.md#5-configuration-store).

## `src/utils/moduleImportExport.ts`

See [features/module-import-export.md](../features/module-import-export.md).

## `src/utils/markdownParser.ts`

See [features/markdown-and-mentions.md](../features/markdown-and-mentions.md).

## `src/utils/storage.ts`

See [architecture/persistence-and-state.md](../architecture/persistence-and-state.md).

## `src/utils/files/*`

See [utils/files.md](files.md).

## `src/utils/dice-roller/*`

See [features/dice-roller.md](../features/dice-roller.md).

## `src/utils/probability-calculator-python/`

Out of scope for this documentation. This is a reference project (`PythonDice`,
the `dice-calc` package) for a separate, planned probability feature. It is not
imported by the application and is intentionally left as-is.

## Composables

### `useModalState.ts`

Global modal stack + mention stack. Described in
[components/modals-and-navigation.md](../components/modals-and-navigation.md).

### `useDragSnap.ts`

Pointer-drag helper returning `cardStyle`, `transitionHide`, and handlers.
Used by the calculator and jukebox bottom sheets. `onPointerMove` runs on
pointermove events on the card; `onPointerUp` snaps back unless dragged up more
than 200px. It does not listen for `pointercancel` outside the element, so a
lost pointer can leave the card offset until the next interaction.

## Types and forms

- `src/types/index.ts` — entities, `Section`, `ComponentInjection`.
- `src/types/migration.ts` — migration interface.
- `src/types/forms/form-filed.ts` — a full form-description model
  (`FormField` union with checkbox/radio/select/number/string/pattern/text/file).
  It is not used by any current form; all forms are hand-written Quasar inputs.
- `src/types/forms/form-input.ts` — `Record<UUID, number|string|boolean|string[]>`.

The unused form model suggests an abandoned declarative-forms direction.

## Remaining helpers

- `isArray`, `hasRequiredFields` — trivial guards in `storage.ts`; retained for
  compatibility/tests.
- `StorageError` — error class with optional `key` and `cause`.
- `MAIN_STORE_NAMES`, `backupAllStores`, `restoreAllStores`, `clearStore` — see
  backup docs.
