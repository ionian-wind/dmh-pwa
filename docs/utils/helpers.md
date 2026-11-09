# Utility Helpers

Small, mostly pure helpers used across the app.

## `src/utils/debug.ts`

```ts
debug(...args); // console.log in development only
debugWarn(...args); // console.warn in development only
debugError(...args); // console.error in development only
exposeConsole(); // replaces global console with node:console (tests)
```

Every module uses these instead of `console.*`; the remaining direct `console`
calls are in WIP dice-engine debug branches. `debug*` is gated on
`import.meta.env.MODE === 'development'`, so test and production builds are
silent. `tests/setup.ts` swaps in Node's `Console` through `exposeConsole()` so
test output is still visible.

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

`validateArray` returns `false` for non-arrays and otherwise checks every
item's `valid` flag; it is not used by the current stores.

## `src/utils/anchorScroll.ts`

`setupAnchorScrollHandler()`:

- Registers a `popstate` listener that reads `window.location.hash` and scrolls
  the matching element into view (`behavior: 'auto'`, block centered).
- On initial load with a hash, polls every 100ms up to 20 times (2s) for the
  element, then scrolls smoothly, also centered.

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
cropTitle(title, (max = 25));
```

Returns the title unchanged if short, otherwise the first `max` characters plus
`…`. No word-boundary awareness. Throws if `title` is not a string.

## `src/utils/rng.ts` and `src/utils/random.ts`

`src/utils/rng.ts` is the shared RNG and weighted-sampling library used by the
dice roller and the dice probability calculator.

```ts
cryptoRng()                         // crypto-backed uniform RNG
sequenceRng([0.1, 0.5, 0.9])        // deterministic test/replay RNG
nextRandom(rng, context?)           // validated draw in [0, 1)
rollDie(rng, sides, context?)       // uniform integer in [1, sides]
randomInt(rng, maxExclusive)
pickWeightedIndex(weights, rng)
pickWeightedBigIntIndex(weights, rng)
pickWeighted(items, weightOf, rng)
sampleWeighted(items, weightOf, amount, rng)
captureRngState(rng) / finishRngState(rng, state) / restoreRngState(rng, state)
```

`src/utils/random.ts` re-exports the shared API and keeps the legacy helpers:

```ts
rng() => Math.random()
getRandomInt(max) => Math.floor(rng() * max)
```

New dice/probability code should inject an `Rng`; `cryptoRng()` is the default
for production roll/sample paths.

## `src/utils/configStore.ts`

A Pinia config store with manual localStorage persistence:

- Prefix `dmh-config:`.
- `getValue` JSON parses and throws on malformed values.
- Each key is watched and written back.
- Values listed in
  [architecture/persistence-and-state.md](../architecture/persistence-and-state.md#5-configuration-store).

## `src/utils/markdownParser.ts`

See [features/markdown-and-mentions.md](../features/markdown-and-mentions.md).

## `src/utils/storage.ts`

See [architecture/persistence-and-state.md](../architecture/persistence-and-state.md).

## `src/utils/files/*`

See [utils/files.md](files.md).

## `src/utils/bag-of-dice/*`

See [features/dice-roller/README.md](../features/dice-roller/README.md) and the
[bag-of-dice README](../../src/utils/bag-of-dice/README.md). The engine uses the
shared `src/utils/rng.ts` library.

## `src/utils/dice-probability-calculator/*`

See [features/dice-probability-calculator/](../features/dice-probability-calculator/README.md).
This is the maintained AnyDice-compatible probability library, connected to
`src/probability-calculator/` and sampling through the shared RNG library.

## Composables

### `useModalState.ts`

Global modal stack + mention stack. Described in
[components/modals-and-navigation.md](../components/modals-and-navigation.md).

### `useDragSnap.ts`

Pointer-drag helper returning `cardStyle`, `transitionHide`, `isDragging`,
`pointerX`/`pointerY`, `translateX`/`translateY`, and the handlers
`onPointerDown`, `onPointerMove`, `onPointerUp`, `onHide`, `endDrag`,
`resetPosition`, `rebaseDrag`, `setPosition` and `rebaseDragOrigin`. Accepts
optional `snapBack()` and `onRelease()` callbacks. Used by the calculator and
jukebox (`SoundControlDialog`) bottom sheets. `onPointerUp` snaps back unless dragged up
more than 200px. It does not listen for `pointercancel` outside the element, so
a lost pointer can leave the card offset until the next interaction.

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
